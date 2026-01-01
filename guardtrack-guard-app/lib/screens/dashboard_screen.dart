import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';
import '../providers/assignment_provider.dart';
import '../widgets/loading_indicator.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        Provider.of<AssignmentProvider>(context, listen: false)
            .loadActiveAssignment();
      }
    });
  }

  void _handleLogout() {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    authProvider.logout();
    if (mounted) {
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }

  /// Calculate next due time from lastScan or startTime
  /// Status logic: nextDueTime = (lastScan ?? startTime) + intervalMinutes
  DateTime _calculateNextDueTime(DateTime startTime, int intervalMinutes, DateTime? lastScan) {
    final baseTime = lastScan ?? startTime;
    return baseTime.add(Duration(minutes: intervalMinutes));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('GuardTrack'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Logout',
            onPressed: _handleLogout,
          ),
        ],
      ),
      body: Consumer<AssignmentProvider>(
        builder: (context, assignmentProvider, _) {
          if (assignmentProvider.isLoading) {
            return const LoadingIndicator(message: 'Loading assignment...');
          }

          if (assignmentProvider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    assignmentProvider.error!,
                    style: const TextStyle(color: Colors.red),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      assignmentProvider.loadActiveAssignment();
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (!assignmentProvider.hasAssignment) {
            return const Center(
              child: Text('No active assignment found'),
            );
          }

          final assignment = assignmentProvider.activeAssignment!;
          final dateFormat = DateFormat('MMM dd, yyyy hh:mm a');
          
          // Calculate next due time (using startTime as base, since we don't have lastScan yet)
          // In a real scenario, you'd fetch the latest check-in to get lastScan
          final nextDueTime = _calculateNextDueTime(
            assignment.startTime,
            assignment.intervalMinutes,
            null, // TODO: Fetch latest check-in to get actual lastScan
          );
          
          final now = DateTime.now();
          final isOverdue = now.isAfter(nextDueTime);
          final timeUntilDue = nextDueTime.difference(now);

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Premise name
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          assignment.premise.name,
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        if (assignment.premise.address != null) ...[
                          const SizedBox(height: 8),
                          Text(assignment.premise.address!),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                // Shift Details
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Shift Details',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 16),
                        _buildInfoRow(
                          'Start Time',
                          dateFormat.format(assignment.startTime),
                        ),
                        _buildInfoRow(
                          'End Time',
                          dateFormat.format(assignment.endTime),
                        ),
                        _buildInfoRow(
                          'Interval',
                          '${assignment.intervalMinutes} minutes',
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                // Next Due Time
                Card(
                  color: isOverdue ? Colors.red.shade50 : Colors.green.shade50,
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              isOverdue ? Icons.warning : Icons.schedule,
                              color: isOverdue ? Colors.red : Colors.green,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Next Due Time',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                color: isOverdue ? Colors.red : Colors.green,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          dateFormat.format(nextDueTime),
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (!isOverdue) ...[
                          const SizedBox(height: 8),
                          Text(
                            'In ${_formatDuration(timeUntilDue)}',
                            style: TextStyle(
                              color: Colors.green.shade700,
                              fontSize: 14,
                            ),
                          ),
                        ] else ...[
                          const SizedBox(height: 8),
                          Text(
                            'Overdue by ${_formatDuration(timeUntilDue.abs())}',
                            style: TextStyle(
                              color: Colors.red.shade700,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                // Action Buttons
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.of(context).pushNamed('/scan');
                        },
                        icon: const Icon(Icons.qr_code_scanner),
                        label: const Text('Scan QR'),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.of(context).pushNamed('/checkpoints');
                        },
                        icon: const Icon(Icons.location_on),
                        label: const Text('View Checkpoints'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.of(context).pushNamed('/history');
                    },
                    icon: const Icon(Icons.history),
                    label: const Text('History'),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          Text(value),
        ],
      ),
    );
  }

  String _formatDuration(Duration duration) {
    if (duration.inDays > 0) {
      return '${duration.inDays}d ${duration.inHours % 24}h';
    } else if (duration.inHours > 0) {
      return '${duration.inHours}h ${duration.inMinutes % 60}m';
    } else {
      return '${duration.inMinutes}m';
    }
  }
}

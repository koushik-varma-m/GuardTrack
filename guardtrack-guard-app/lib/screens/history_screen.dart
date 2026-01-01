import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/checkin_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/loading_indicator.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final DateFormat _timeFormat = DateFormat('hh:mm a');
  final DateFormat _displayDateFormat = DateFormat('MMM dd, yyyy');

  void _handleLogout() {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    authProvider.logout();
    if (mounted) {
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        Provider.of<CheckInProvider>(context, listen: false).loadHistory();
      }
    });
  }

  Future<void> _selectDate(BuildContext context) async {
    final checkInProvider = Provider.of<CheckInProvider>(context, listen: false);
    
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: checkInProvider.selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    
    if (picked != null && picked != checkInProvider.selectedDate) {
      // On date change → setDate and loadHistory()
      checkInProvider.setDate(picked);
      await checkInProvider.loadHistory();
    }
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
      body: Column(
        children: [
          // DatePicker button
          Consumer<CheckInProvider>(
            builder: (context, checkInProvider, _) {
              return Card(
                margin: const EdgeInsets.all(16),
                child: ListTile(
                  leading: const Icon(Icons.calendar_today),
                  title: const Text('Select Date'),
                  subtitle: Text(
                    _displayDateFormat.format(checkInProvider.selectedDate),
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => _selectDate(context),
                ),
              );
            },
          ),
          // ListView.builder showing check-ins
          Expanded(
            child: Consumer<CheckInProvider>(
              builder: (context, checkInProvider, _) {
                if (checkInProvider.isLoading) {
                  return const LoadingIndicator(message: 'Loading history...');
                }

                if (checkInProvider.error != null) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          checkInProvider.error!,
                          style: const TextStyle(color: Colors.red),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () {
                            checkInProvider.loadHistory();
                          },
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                if (checkInProvider.history.isEmpty) {
                  return const Center(
                    child: Text('No check-ins found for this date'),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    await checkInProvider.loadHistory();
                  },
                  child: ListView.builder(
                    itemCount: checkInProvider.history.length,
                    itemBuilder: (context, index) {
                      final checkIn = checkInProvider.history[index];
                      return Card(
                        margin: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        child: ListTile(
                          leading: Icon(
                            checkIn.isOnTime ? Icons.check_circle : Icons.error,
                            color: checkIn.isOnTime ? Colors.green : Colors.red,
                          ),
                          title: Text(
                            checkIn.checkpoint?.name ?? 'Unknown Checkpoint',
                          ),
                          subtitle: Text(
                            // Time formatted with intl
                            _timeFormat.format(checkIn.scannedAt),
                          ),
                          trailing: Chip(
                            // Tag: "On Time" (green) or "Late" (red) based on isOnTime
                            label: Text(
                              checkIn.isOnTime ? 'On Time' : 'Late',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            backgroundColor:
                                checkIn.isOnTime ? Colors.green : Colors.red,
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

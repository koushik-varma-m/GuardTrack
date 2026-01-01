import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/assignment_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/loading_indicator.dart';

class CheckpointListScreen extends StatefulWidget {
  const CheckpointListScreen({super.key});

  @override
  State<CheckpointListScreen> createState() => _CheckpointListScreenState();
}

class _CheckpointListScreenState extends State<CheckpointListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        Provider.of<AssignmentProvider>(context, listen: false).loadCheckpoints();
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('GuardTrack'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            tooltip: 'Scan QR',
            onPressed: () {
              Navigator.of(context).pushNamed('/scan');
            },
          ),
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
            return const LoadingIndicator(message: 'Loading checkpoints...');
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
                      assignmentProvider.loadCheckpoints();
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (assignmentProvider.checkpoints.isEmpty) {
            return const Center(
              child: Text('No checkpoints available'),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              await assignmentProvider.loadCheckpoints();
            },
            child: ListView.builder(
              itemCount: assignmentProvider.checkpoints.length,
              itemBuilder: (context, index) {
                final checkpoint = assignmentProvider.checkpoints[index];
                return Card(
                  margin: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  child: ListTile(
                    leading: const Icon(Icons.location_on),
                    title: Text(checkpoint.name),
                    subtitle: checkpoint.description != null
                        ? Text(checkpoint.description!)
                        : null,
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      Navigator.of(context).pushNamed('/scan');
                    },
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

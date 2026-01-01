import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import '../providers/checkin_provider.dart';
import '../providers/auth_provider.dart';
import '../models/checkin.dart';
import '../widgets/loading_indicator.dart';

class QrScanScreen extends StatefulWidget {
  const QrScanScreen({super.key});

  @override
  State<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends State<QrScanScreen> {
  final MobileScannerController _controller = MobileScannerController();
  final _formKey = GlobalKey<FormState>();
  bool _isProcessing = false;
  bool _isScanning = true;

  void _handleLogout() {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    authProvider.logout();
    if (mounted) {
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }

  /// Check-in logic: Parse QR code, create check-in, show status result
  /// QR format: {"checkpointId": "...", "premiseId": "..."}
  /// Status returned: GREEN (on time), ORANGE (late), RED (very late)
  Future<void> _handleQrCode(String rawValue) async {
    if (_isProcessing || !_isScanning) return;

    setState(() {
      _isProcessing = true;
      _isScanning = false; // Pause scanning
    });

    try {
      // Parse JSON from QR code with fields { checkpointId, premiseId }
      final qrData = jsonDecode(rawValue);
      final checkpointId = qrData['checkpointId'] as String?;

      if (checkpointId == null) {
        throw Exception('Invalid QR code format: missing checkpointId');
      }

      // Create check-in: POST /me/checkins with checkpointId
      // Returns status (GREEN/ORANGE/RED) based on timing
      final checkInProvider =
          Provider.of<CheckInProvider>(context, listen: false);
      await checkInProvider.createCheckIn(checkpointId);

      if (!mounted) return;

      final response = checkInProvider.lastCheckIn;
      if (response != null) {
        // Show dialog with checkpointName, message, and status color
        await _showResultDialog(response);
        
        // Add a short delay and then resume scanning
        await Future.delayed(const Duration(seconds: 2));
        
        if (mounted) {
          setState(() {
            _isScanning = true; // Resume scanning
          });
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(checkInProvider.error ?? 'Check-in failed'),
            backgroundColor: Colors.red,
          ),
        );
        // Resume scanning on error
        if (mounted) {
          setState(() {
            _isScanning = true;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
        // Resume scanning on error
        setState(() {
          _isScanning = true;
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  Future<void> _showResultDialog(CheckInResponse response) async {
    // Determine status color: green/orange/red based on status
    Color statusColor;
    IconData statusIcon;
    
    switch (response.status.toUpperCase()) {
      case 'GREEN':
        statusColor = Colors.green;
        statusIcon = Icons.check_circle;
        break;
      case 'ORANGE':
        statusColor = Colors.orange;
        statusIcon = Icons.warning;
        break;
      case 'RED':
        statusColor = Colors.red;
        statusIcon = Icons.error;
        break;
      default:
        statusColor = Colors.grey;
        statusIcon = Icons.info;
    }

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(statusIcon, color: statusColor),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                response.checkpointName,
                style: TextStyle(color: statusColor),
              ),
            ),
          ],
        ),
        content: Text(response.message),
        backgroundColor: statusColor.withValues(alpha: 0.1),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleManualEntry() async {
    final checkpointIdController = TextEditingController();
    
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Manual Entry'),
        content: Form(
          key: _formKey,
          child: TextFormField(
            controller: checkpointIdController,
            decoration: const InputDecoration(
              labelText: 'Checkpoint ID',
              hintText: 'Enter checkpoint ID',
              border: OutlineInputBorder(),
            ),
            autofocus: true,
            // Basic validation messages on manual checkpoint input
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Please enter a checkpoint ID';
              }
              if (value.trim().length < 3) {
                return 'Checkpoint ID must be at least 3 characters';
              }
              return null;
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              if (_formKey.currentState!.validate()) {
                Navigator.of(context).pop(checkpointIdController.text.trim());
              }
            },
            child: const Text('Submit'),
          ),
        ],
      ),
    );

    if (result != null && result.isNotEmpty) {
      // Pause scanning
      setState(() {
        _isScanning = false;
      });
      
      // Call createMyCheckIn with the entered checkpointId
      await _handleQrCode('{"checkpointId":"$result"}');
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
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
      body: Stack(
        children: [
          // MobileScanner widget to show camera preview
          if (_isScanning)
            MobileScanner(
              controller: _controller,
              onDetect: (capture) {
                final List<Barcode> barcodes = capture.barcodes;
                for (final barcode in barcodes) {
                  if (barcode.rawValue != null) {
                    _handleQrCode(barcode.rawValue!);
                    break;
                  }
                }
              },
            )
          else
            Container(
              color: Colors.black,
              child: const Center(
                child: Text(
                  'Processing...',
                  style: TextStyle(color: Colors.white),
                ),
              ),
            ),
          if (_isProcessing)
            Container(
              color: Colors.black54,
              child: const LoadingIndicator(message: 'Processing check-in...'),
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _isProcessing ? null : _handleManualEntry,
        icon: const Icon(Icons.edit),
        label: const Text('Manual Entry'),
      ),
    );
  }
}

import 'package:flutter/foundation.dart';
import '../models/assignment.dart';
import '../models/checkpoint.dart';
import '../services/assignment_service.dart';
import '../services/checkin_service.dart';

class AssignmentProvider with ChangeNotifier {
  Assignment? activeAssignment;
  List<Checkpoint> checkpoints = [];
  bool _isLoading = false;
  String? _error;

  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasAssignment => activeAssignment != null;

  Future<void> loadActiveAssignment() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      activeAssignment = await AssignmentService.getActiveAssignment();
      _error = null;
    } catch (e) {
      _error = e.toString();
      activeAssignment = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadCheckpoints() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      checkpoints = await CheckInService.getMyCheckpoints();
      _error = null;
    } catch (e) {
      _error = e.toString();
      checkpoints = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}

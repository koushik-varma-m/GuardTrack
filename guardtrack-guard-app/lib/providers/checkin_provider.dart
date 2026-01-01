import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
import '../models/checkin.dart';
import '../services/checkin_service.dart';

class CheckInProvider with ChangeNotifier {
  List<CheckIn> history = [];
  DateTime selectedDate = DateTime.now();
  bool _isLoading = false;
  String? _error;
  CheckInResponse? _lastCheckIn;

  bool get isLoading => _isLoading;
  String? get error => _error;
  CheckInResponse? get lastCheckIn => _lastCheckIn;

  void setDate(DateTime date) {
    selectedDate = date;
    notifyListeners();
  }

  Future<void> loadHistory() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Format date as YYYY-MM-DD
      final dateFormat = DateFormat('yyyy-MM-dd');
      final dateString = dateFormat.format(selectedDate);
      
      history = await CheckInService.getHistory(dateString);
      _error = null;
    } catch (e) {
      _error = e.toString();
      history = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> createCheckIn(String checkpointId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _lastCheckIn = await CheckInService.createMyCheckIn(checkpointId);
      _error = null;
    } catch (e) {
      _error = e.toString();
      _lastCheckIn = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void clearLastCheckIn() {
    _lastCheckIn = null;
    notifyListeners();
  }
}

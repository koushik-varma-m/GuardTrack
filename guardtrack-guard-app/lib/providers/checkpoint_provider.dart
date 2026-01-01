import 'package:flutter/foundation.dart';
import 'dart:convert';
import '../config/api_config.dart';
import '../models/checkpoint.dart';
import '../services/api_service.dart';

class CheckpointProvider with ChangeNotifier {
  List<Checkpoint> _checkpoints = [];
  bool _isLoading = false;
  String? _error;

  List<Checkpoint> get checkpoints => _checkpoints;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadCheckpoints() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await ApiService.get(ApiConfig.checkpoints);
      
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        _checkpoints = data.map((json) => Checkpoint.fromJson(json)).toList();
        _error = null;
      } else {
        final error = jsonDecode(response.body);
        _error = error['error'] ?? 'Failed to load checkpoints';
        _checkpoints = [];
      }
    } catch (e) {
      _error = e.toString();
      _checkpoints = [];
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


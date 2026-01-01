import 'dart:convert';
import '../config/api_config.dart';
import '../models/checkin.dart';
import '../models/checkpoint.dart';
import 'api_service.dart';

/// Check-in service for creating check-ins and fetching history
class CheckInService {
  /// Create check-in: POST /me/checkins with checkpointId
  /// Returns CheckInResponse with success, checkpointName, status (GREEN/ORANGE/RED), and message
  static Future<CheckInResponse> createMyCheckIn(String checkpointId) async {
    final response = await ApiService.post(
      ApiConfig.checkins,
      {'checkpointId': checkpointId},
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return CheckInResponse.fromJson(jsonDecode(response.body));
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Failed to create check-in');
    }
  }

  /// Get check-in history: GET /me/checkins/history?date=YYYY-MM-DD
  /// Token is automatically injected by ApiService from shared_preferences
  static Future<List<CheckIn>> getHistory(String date) async {
    final response = await ApiService.get(
      '${ApiConfig.checkinHistory}?date=$date',
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => CheckIn.fromJson(json)).toList();
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Failed to fetch history');
    }
  }

  /// Get checkpoints for active assignment: GET /me/checkpoints
  static Future<List<Checkpoint>> getMyCheckpoints() async {
    final response = await ApiService.get(ApiConfig.checkpoints);

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => Checkpoint.fromJson(json)).toList();
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Failed to fetch checkpoints');
    }
  }
}

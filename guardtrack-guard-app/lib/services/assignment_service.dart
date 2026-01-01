import 'dart:convert';
import '../config/api_config.dart';
import '../models/assignment.dart';
import 'api_service.dart';

class AssignmentService {
  // Token is automatically injected by ApiService from shared_preferences
  static Future<Assignment> getActiveAssignment() async {
    final response = await ApiService.get(ApiConfig.activeAssignment);

    if (response.statusCode == 200) {
      return Assignment.fromJson(jsonDecode(response.body));
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Failed to fetch assignment');
    }
  }
}

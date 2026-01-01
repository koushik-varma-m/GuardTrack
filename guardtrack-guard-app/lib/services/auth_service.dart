import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import '../models/user.dart';
import 'api_service.dart';

/// Authentication service for login, logout, and token management
class AuthService {
  /// Login: POST /auth/login with email and password
  /// On success, saves token and user JSON to shared_preferences
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await ApiService.post(
      ApiConfig.login,
      {
        'email': email,
        'password': password,
      },
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final token = data['token'];
      final user = User.fromJson(data['user']);

      // Save token and user JSON using shared_preferences
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', token);
      await prefs.setString('user', jsonEncode(user.toJson()));

      return {
        'success': true,
        'token': token,
        'user': user,
      };
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Login failed');
    }
  }

  /// Load saved authentication from shared_preferences
  static Future<Map<String, dynamic>?> loadSavedAuth() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    final userJson = prefs.getString('user');

    if (token != null && userJson != null) {
      try {
        final user = User.fromJson(jsonDecode(userJson));
        return {
          'token': token,
          'user': user,
        };
      } catch (e) {
        // Invalid user data, clear it
        await logout();
        return null;
      }
    }

    return null;
  }

  /// Logout: Clear token and user from shared_preferences
  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user');
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Future<User?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('user');
    if (userJson != null) {
      return User.fromJson(jsonDecode(userJson));
    }
    return null;
  }

  static Future<bool> isAuthenticated() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
}

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class ApiService {
  // Global navigator key for navigation without context
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  static Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    
    final headers = {
      'Content-Type': 'application/json',
    };
    
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    
    return headers;
  }

  static Future<void> _handle401() async {
    // On 401 responses: Auto logout and redirect to LoginScreen
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user');
    
    // Navigate to login screen
    if (navigatorKey.currentContext != null) {
      Navigator.of(navigatorKey.currentContext!).pushNamedAndRemoveUntil(
        '/login',
        (route) => false,
      );
    }
  }

  static Future<http.Response> get(String endpoint) async {
    final headers = await _getHeaders();
    final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
    
    final response = await http.get(url, headers: headers);
    
    // Handle 401 Unauthorized
    if (response.statusCode == 401) {
      await _handle401();
    }
    
    return response;
  }

  static Future<http.Response> post(String endpoint, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
    
    final response = await http.post(
      url,
      headers: headers,
      body: jsonEncode(body),
    );
    
    // Handle 401 Unauthorized
    if (response.statusCode == 401) {
      await _handle401();
    }
    
    return response;
  }

  static Future<http.Response> put(String endpoint, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
    
    final response = await http.put(
      url,
      headers: headers,
      body: jsonEncode(body),
    );
    
    // Handle 401 Unauthorized
    if (response.statusCode == 401) {
      await _handle401();
    }
    
    return response;
  }

  static Future<http.Response> delete(String endpoint) async {
    final headers = await _getHeaders();
    final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
    
    final response = await http.delete(url, headers: headers);
    
    // Handle 401 Unauthorized
    if (response.statusCode == 401) {
      await _handle401();
    }
    
    return response;
  }
}

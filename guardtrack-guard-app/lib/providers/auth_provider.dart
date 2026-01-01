import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../services/auth_service.dart';

class AuthProvider with ChangeNotifier {
  User? currentUser;
  String? token;
  bool isLoading = false;
  String? _error;

  String? get error => _error;
  bool get isAuthenticated => token != null && currentUser != null;

  Future<void> tryAutoLogin() async {
    isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final savedAuth = await AuthService.loadSavedAuth();
      if (savedAuth != null) {
        token = savedAuth['token'] as String;
        currentUser = savedAuth['user'] as User;
        _error = null;
      } else {
        token = null;
        currentUser = null;
      }
    } catch (e) {
      _error = e.toString();
      token = null;
      currentUser = null;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await AuthService.login(email, password);
      token = result['token'] as String;
      currentUser = result['user'] as User;
      _error = null;
      return true;
    } catch (e) {
      _error = e.toString();
      token = null;
      currentUser = null;
      return false;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  void logout() {
    AuthService.logout();
    currentUser = null;
    token = null;
    _error = null;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}

class ApiConfig {
  // Change this to your deployed backend URL
  static const String baseUrl = 'http://localhost:4000/api/v1';
  
  // API Endpoints
  static const String login = '/auth/login';
  static const String profile = '/me/profile';
  static const String activeAssignment = '/me/assignments/active';
  static const String checkpoints = '/me/checkpoints';
  static const String checkins = '/me/checkins';
  static const String checkinHistory = '/me/checkins/history';
}


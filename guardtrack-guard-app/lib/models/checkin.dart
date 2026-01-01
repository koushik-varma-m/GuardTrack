import 'checkpoint.dart';

class CheckIn {
  final String id;
  final String checkpointId;
  final String assignmentId;
  final DateTime scannedAt;
  final bool isOnTime;
  final DateTime createdAt;
  final Checkpoint? checkpoint;
  final AssignmentInfo? assignment;

  CheckIn({
    required this.id,
    required this.checkpointId,
    required this.assignmentId,
    required this.scannedAt,
    required this.isOnTime,
    required this.createdAt,
    this.checkpoint,
    this.assignment,
  });

  factory CheckIn.fromJson(Map<String, dynamic> json) {
    return CheckIn(
      id: json['id'],
      checkpointId: json['checkpointId'],
      assignmentId: json['assignmentId'],
      scannedAt: DateTime.parse(json['scannedAt']),
      isOnTime: json['isOnTime'],
      createdAt: DateTime.parse(json['createdAt']),
      checkpoint: json['checkpoint'] != null
          ? Checkpoint.fromJson(json['checkpoint'])
          : null,
      assignment: json['assignment'] != null
          ? AssignmentInfo.fromJson(json['assignment'])
          : null,
    );
  }
}

class CheckInResponse {
  final bool success;
  final String checkpointName;
  final DateTime scannedAt;
  final bool isOnTime;
  final String status; // GREEN, ORANGE, RED
  final String message;

  CheckInResponse({
    required this.success,
    required this.checkpointName,
    required this.scannedAt,
    required this.isOnTime,
    required this.status,
    required this.message,
  });

  factory CheckInResponse.fromJson(Map<String, dynamic> json) {
    return CheckInResponse(
      success: json['success'],
      checkpointName: json['checkpointName'],
      scannedAt: DateTime.parse(json['scannedAt']),
      isOnTime: json['isOnTime'],
      status: json['status'],
      message: json['message'],
    );
  }
}

class AssignmentInfo {
  final String id;
  final PremiseInfo premise;

  AssignmentInfo({
    required this.id,
    required this.premise,
  });

  factory AssignmentInfo.fromJson(Map<String, dynamic> json) {
    return AssignmentInfo(
      id: json['id'],
      premise: PremiseInfo.fromJson(json['premise']),
    );
  }
}

class PremiseInfo {
  final String id;
  final String name;

  PremiseInfo({
    required this.id,
    required this.name,
  });

  factory PremiseInfo.fromJson(Map<String, dynamic> json) {
    return PremiseInfo(
      id: json['id'],
      name: json['name'],
    );
  }
}


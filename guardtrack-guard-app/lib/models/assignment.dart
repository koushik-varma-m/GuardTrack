class Assignment {
  final String id;
  final Premise premise;
  final int intervalMinutes;
  final DateTime startTime;
  final DateTime endTime;
  final DateTime createdAt;
  final DateTime updatedAt;

  Assignment({
    required this.id,
    required this.premise,
    required this.intervalMinutes,
    required this.startTime,
    required this.endTime,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Assignment.fromJson(Map<String, dynamic> json) {
    return Assignment(
      id: json['id'],
      premise: Premise.fromJson(json['premise']),
      intervalMinutes: json['intervalMinutes'],
      startTime: DateTime.parse(json['startTime']),
      endTime: DateTime.parse(json['endTime']),
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }
}

class Premise {
  final String id;
  final String name;
  final String? address;
  final String? mapImageUrl;

  Premise({
    required this.id,
    required this.name,
    this.address,
    this.mapImageUrl,
  });

  factory Premise.fromJson(Map<String, dynamic> json) {
    return Premise(
      id: json['id'],
      name: json['name'],
      address: json['address'],
      mapImageUrl: json['mapImageUrl'],
    );
  }
}


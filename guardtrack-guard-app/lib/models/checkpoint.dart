class Checkpoint {
  final String id;
  final String name;
  final String? description;
  final double xCoord;
  final double yCoord;
  final int? sequence;
  final String qrCodeValue;
  final DateTime createdAt;
  final DateTime updatedAt;

  Checkpoint({
    required this.id,
    required this.name,
    this.description,
    required this.xCoord,
    required this.yCoord,
    this.sequence,
    required this.qrCodeValue,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Checkpoint.fromJson(Map<String, dynamic> json) {
    return Checkpoint(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      xCoord: (json['xCoord'] as num).toDouble(),
      yCoord: (json['yCoord'] as num).toDouble(),
      sequence: json['sequence'],
      qrCodeValue: json['qrCodeValue'],
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }
}

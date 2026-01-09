import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:guardtrack_guard_app/main.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Boots to login when logged out', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const MyApp());
    await tester.pump();
    await tester.pumpAndSettle();

    expect(find.text('Guard Track'), findsOneWidget);
    expect(find.text('Login'), findsOneWidget);
  });
}

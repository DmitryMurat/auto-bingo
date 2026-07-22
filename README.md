# Авто-бинго

Мобильное приложение для «автобинго»: отмечайте коды регионов на российских госномерах, следите за прогрессом по карте России.

## Стек

- React + TypeScript + Vite
- Capacitor 8 (Android)
- Распознавание номера с камеры (ML Kit), голосовой ввод, интерактивная карта (d3-geo)

## Запуск

```bash
cd frontend
npm install
npm run dev
```

## Сборка Android

```bash
cd frontend
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

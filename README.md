# GameGems

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?logo=solidity&logoColor=white)](https://soliditylang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**GameGems** — Web3-игра-кликер с NFT-предметами, токеном GEM, экипировкой и торговой площадкой. Проект объединяет frontend на React, API на FastAPI, смарт-контракты Solidity и ML-модель для рекомендации цены NFT.

## Возможности

- авторизация и создание игрового профиля через MetaMask;
- получение GEM и случайных предметов в кликере;
- инвентарь, экипировка и бонусы предметов;
- быстрая продажа предметов за GEM;
- преобразование игровых предметов в NFT;
- выставление и снятие NFT с продажи на маркетплейсе;
- ML-рекомендация рыночной цены NFT;
- административная панель и история транзакций.

## Технологии

| Часть | Технологии |
| --- | --- |
| Frontend | React 19, Vite, ethers.js, Axios |
| Backend | Python, FastAPI, Pandas, boto3 |
| Blockchain | Solidity 0.8.28, Hardhat, OpenZeppelin |
| ML | scikit-learn 1.6.1, Random Forest, joblib |
| Хранилище | Yandex Object Storage (S3 API) |
| Тесты | Jest, Testing Library, Pytest, Hardhat |

## Требования

- Node.js 20 или новее;
- npm 10 или новее;
- Python 3.12 или 3.13;
- расширение [MetaMask](https://metamask.io/) в браузере;
- S3-совместимое хранилище для профилей, инвентаря и NFT-метаданных.

## Установка

Клонируйте репозиторий:

```powershell
git clone https://github.com/Sergo20025/GameGems.git
cd GameGems
```

Установите JavaScript-зависимости:

```powershell
npm.cmd install
```

Создайте виртуальное окружение Python и установите backend-зависимости:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt
```

## Переменные окружения

Создайте локальный файл из шаблона:

```powershell
Copy-Item backend\.env.example backend\.env
```

Заполните `backend/.env` данными своего S3-хранилища:

```dotenv
S3_ENDPOINT_URL=https://storage.yandexcloud.net
S3_KEY=your-access-key
S3_SECRET=your-secret-key
S3_BUCKET_NAME=your-bucket-name
```

Файл `backend/.env` добавлен в `.gitignore` и не публикуется.

## Запуск

Для локальной разработки нужны три терминала. Все команды выполняются из корня проекта.

### 1. Локальный блокчейн

```powershell
npx.cmd hardhat node --hostname 127.0.0.1 --port 7545
```

Оставьте терминал открытым. После запуска сети откройте второй терминал и разверните контракты:

```powershell
npx.cmd hardhat run contracts/deploy.cjs --network ganache
```

Команда развернёт `GameGems`, `GameItemNFT` и `GameMarketplace`, затем обновит адреса в `contracts/contracts.json` и ABI в `src/contracts`.

### 2. Backend

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000 --env-file backend\.env
```

После запуска доступны:

- API: <http://127.0.0.1:8000>
- Swagger UI: <http://127.0.0.1:8000/docs>

### 3. Frontend

```powershell
npm.cmd run dev
```

Приложение откроется по адресу <http://localhost:5173>.

## Настройка MetaMask

Добавьте пользовательскую сеть:

| Поле | Значение |
| --- | --- |
| Имя сети | GameGems Local |
| RPC URL | `http://127.0.0.1:7545` |
| Chain ID | `31337` |
| Символ валюты | ETH |

Импортируйте один из тестовых аккаунтов, используя приватный ключ, который Hardhat выводит при запуске локального узла. Эти ключи предназначены только для локальной разработки: не отправляйте на них реальные средства.

После перезапуска Hardhat состояние локального блокчейна сбрасывается. В этом случае повторно разверните контракты и обновите страницу приложения.

## ML-рекомендация цены

Модель находится в `ml_model/nft_price_regressor.pkl` и загружается при запуске backend. Она принимает тип предмета, редкость и величину бонуса.

Проверка через PowerShell:

```powershell
$body = @{
    itemType = "Lamp"
    rarity = "Rare"
    bonusValue = 3
    price = 1500
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://127.0.0.1:8000/predict-price" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

Для примера выше модель рекомендует цену около `1450 GEM`.

## Тестирование

Frontend и компонентные тесты:

```powershell
npm.cmd test -- --runInBand
```

Тесты смарт-контрактов:

```powershell
npx.cmd hardhat test
```

Backend-тесты:

```powershell
.\.venv\Scripts\python.exe -m pytest
```

Production-сборка frontend:

```powershell
npm.cmd run build
```

## Структура проекта

```text
GameGems/
|-- backend/           # FastAPI, S3 и REST API
|-- contracts/         # Solidity-контракты и deploy-скрипт
|-- ml_model/          # ML-модель и скрипты обучения
|-- public/            # Статические файлы
|-- src/               # React-приложение
|-- test/              # Backend и Hardhat-тесты
|-- hardhat.config.cjs # Локальная blockchain-сеть
`-- vite.config.js     # Конфигурация frontend
```

## Лицензия

Проект распространяется по лицензии [MIT](LICENSE).

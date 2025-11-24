# РЕГИСТРАЦИЯ И ОБНОВЛЕНИЕ

# ПАРТНЕРОВ

### 27.10.

Версия документа: 1. 8

## Оглавление

## ИСТОРИЯ ИЗМЕНЕНИЙ

## 1.

- ИСТОРИЯ ИЗМЕНЕНИЙ
- 1. РЕГИСТРАЦИЯ ТОЧЕК
  - 1.1. ОБЩАЯ ИНФОРМАЦИЯ
  - 1.2. АВТОРИЗАЦИЯ ДЛЯ ИСПОЛЬЗОВАНИЯ API
  - 1.3. РЕГИСТРАЦИЯ ТОЧКИ ДЛЯ ПАРТНЕРА
  - 1.4. ПОЛУЧЕНИЕ ИНФОРМАЦИИ ПО ТОЧКЕ
- 2. ОБНОВЛЕНИЕ ДАННЫХ ПО ПАРТНЕРУ
  - 2.1. ОБЩАЯ ИНФОРМАЦИЯ
  - 2.2. ОБНОВЛЕНИЕ ИНФОРМАЦИИ О ТОЧКЕ
- 1.0 Документ создан 07.08. Версия Описание Дата
- 1.1 Обновлены описания тестового и боевого URL-адресов 03 .12.
- 1.2 Обновлены типы данных в пункте 1.3 «Регистрация точки партнера» 04.02.
- 1.
  - ceo.birthDate 07.03. Обновлены описание параметра ogrn и обязательность параметра
- 1.4 Обновлена обязательность параметра ceo.middleName 25.04.
- 1.5 Обновлены описание параметра email 26.05.
- 1.6 Обновлена обязательность параметра bankAccount.korAccount 1.07.
- 1.7 Обновлена обязательность параметра bankAccount.korAccount 7.08.
- 1.8 Исправления в тексте 27.10.

## 1. РЕГИСТРАЦИЯ ТОЧЕК

### 1.1. ОБЩАЯ ИНФОРМАЦИЯ

Сценарий действий для создания точки для партнера:

- Авторизация для использования API
- Регистрация точки
  Для регистрации точек магазина Мультирасчетов необходимо использовать API создания точек.
  Создание точки для партнера осуществляется вызовом методов с передачей параметров методом POST в
  формате JSON. Все методы и передаваемые параметры являются чувствительными к регистру.
  Для POST запроса в заголовке должен присутствовать Content-Type: application/json

Примечание: Требование про Content-Type: application/json выполняется не для всех POST-запросов.
Например, для запроса на /oauth/token мы используем формат form-data, а не JSON-код, поэтому и заголовок
в нем не нужен

Тестовый URL: https://acqapi-test.tinkoff.ru
Боевой URL: https://acqapi.tinkoff.ru

Для внешнего взаимодействия с сервисом необходимо обращаться по URL-адресам с использованием
сертификата mtls для acqapi.tinkoff.ru. Если у вас нет сертификата, то выпустите его по инструкции.

По вопросам выпуска сертификата обращайтесь в чат поддержки ЛК Бизнеса.

Для возможности отправки запросов напишите на почту acq_help@tbank.ru c просьбой добавить ваши IP в
WL. После чего сможете отправлять запросы.

### 1.2. АВТОРИЗАЦИЯ ДЛЯ ИСПОЛЬЗОВАНИЯ API

Тестовый URL: https://acqapi-test.tinkoff.ru/oauth/token
Боевой URL: https://acqapi.tinkoff.ru/oauth/token

Для возможности отправки запросов напишите на почту acq_help@tbank.ru c просьбой добавить ваши IP в
WL. После чего сможете отправлять запросы.

Метод: POST

### Basic-авторизация клиента

Username: partner
Password: partner

Примечание: _Username=partner, Password=partner имеют постоянное значение на тестовом и продовом
контуре. Актуальные login и password нужно отправлять в теле запроса._

### Авторизация клиента (проверка данных, выданных Банком)

Примечание: _grant_type=password имеет постоянное значение. Переменная часть запроса
«username=login&password=password». Username и password выдает банк_

### Пример вызова

curl -X POST https://sm-register-test.tcsbank.ru/oauth/token -H 'Authorization: Basic cGFydG5lcjpwYXJ0bmVy' –d
"grant_type=password&username=login&password=password"

### Пример ответа

{
"access_token":
"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsicGFydG5lciJdLCJ1c2VyX25hbWUiOiJ0ZXN0bXAiLCJzY29wZSI6WyJwYXJ0bmV
yIl0sImV4cCI6MTUzMjEzODgxOSwiYXV0aG9yaXRpZXMiOlsiUk9MRV9BRE1JTiJdLCJqdGkiOiI4NzBlNjRkMy1kZjg4LTRhYmMtYTEwMC02M
WFiMjUwNGUzZDQiLCJjbGllbnRfaWQiOiJwYXJ0bmVyIn0.SThjQ3cTDAlCMHEtmO-
VkaNjGSr75wLGBSAr9QYkkPQnPbivLL55eBFvDSh1_7DlXbFS9CV8yx33KQFlmFqYbgQ8zh2v1b51tdzKnFStXCRHCpNGBYErUg3_4SV75F
4Krp4vijXckkptDXDjsb5gC_b_cDKlUA3ISlkqHgHeSurmyP0jBw_WiHM7QdNxa9J5LTT_DNXl6iIdH6tIeCcWFN7f8PxFZhZtzFxNvrbh7WkQESm
bywvS_T0tGBiiOqLR0yo85hmwUpUqwiJHoJ2U7gmdsihdF2zI20DXJ1SByAZr4TFL8DT7HelTZanhWXV3ticeFhaW77Cr2rte3-ubQA",
"token_type": "bearer",
"refresh_token":
"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsicGFydG5lciJdLCJ1c2VyX25hbWUiOiJ0ZXN0bXAiLCJzY29wZSI6WyJwYXJ0bmV
yIl0sImF0aSI6Ijg3MGU2NGQzLWRmODgtNGFiYy1hMTAwLTYxYWIyNTA0ZTNkNCIsImV4cCI6MTUzNDY4NzYxOSwiYXV0aG9yaXRpZXMiOlsi
Uk9MRV9BRE1JTiJdLCJqdGkiOiIwNjM0ZGY1MS04YTRjLTQ5YWMtYTFlOC00NjAzYWUxYTljYmUiLCJjbGllbnRfaWQiOiJwYXJ0bmVyIn0.X-
ufZC85qCIYW3sLI4dJIdxfz0LEPF4MKmh\_\_8RHSbQ4xkH8J9P7XJyIYtX0-ejGVmSE7cyIg-OSa6juXYdrHc88ANihnC8dlWI-
ZZOenBDdD6xNuY9MVk4dswy1k5pGUT423FQB1pDZcuBCLD059cWKU4Q3x9mi05HBnPP8KwFjzPzZi3Cs2GhSyMNeDfHMpQvFNKxZL5A
1COc8k4n2VsCIpxDEXVkNGIxkpyRX0s1NiZsE6uSk9kOfUK1ffDkvZxS8xNyBA_nrzgIEGwmR2w92hCS7rNtQhLgBnvsmtqO-
AxAmHxUoFtUquRyM7lIgRl1j4UONb2VeyYC1KgoIYQ",
"expires_in": 43199,
"scope": "partner",
"jti": "870e64d3-df88-4abc-a100-61ab2504e3d4"
}

Примечание: _В дальнейшем методе регистрации точки необходимо использовать в заголовке:
Authorization:Bearer + access_token (полученный в ответ на вызов метода авторизации -
https://<host>/oauth/token)_

### 1.3. РЕГИСТРАЦИЯ ТОЧКИ ДЛЯ ПАРТНЕРА

### Запрос

Тестовый URL: https://acqapi-test.tinkoff.ru/sm-register/register

Боевой URL: https://acqapi.tinkoff.ru/sm-register/register

Для возможности отправки запросов напишите на почту acq_help@tbank.ru c просьбой добавить ваши IP в
WL. После чего сможете отправлять запросы.

Метод: POST

```
Таблица 1.3.1. Параметры запроса
```

```
Наименование Тип Обязательность Описание
```

```
serviceProviderEmail String Нет Email магазина
```

```
mcc^1 Integer Нет MCC-код торговой группы
```

```
shopArticleId String (32) Нет
```

```
Код точки на стороне магазина
Мультирасчетов. Если данные не
переданы, то банк присваивает
значение на своей стороне.
```

```
billingDescriptor String Да
```

```
Название магазина в СМС и на странице
проверки 3 DS на иностранном языке
```

```
fullName String Да Полное наименование организации
```

```
name^2 String (512) Да
```

```
Сокращенное наименование
организации
```

```
inn String Да ИНН
```

```
kpp^3 String Да КПП
```

```
okved String Нет ОКВЭД
```

```
ogrn Integer Да Основной регистрационный номер
```

```
regDepartment String Нет Орган государственной регистрации
```

```
regDate String Нет Дата присвоения ОГРН
```

```
addresses^4 Array Да Адреса организации
```

```
addresses[].type String Да
```

```
Тип адреса организации:
legal - юридический
actual - фактический
```

```
Наименование Тип Обязательность Описание
```

```
post - почтовый
other - прочий
```

addresses[].zip String Да Почтовый индекс

addresses[].country String Да Трехбуквенный код страны по ISO

addresses[].city String Да Город или населенный пункт

addresses[].street String Да Улица, дом

addresses[].description String Нет Дополнительное описание

phones Array Нет Телефоны организации

phones[].type String Нет

```
Тип телефона организации:
common – основной
fax – факс
other - прочий
```

phones[].phone String Нет Телефон

phones[].description String Нет Дополнительное описание

email String Да Email партнера

assets String Нет

```
Сведения о величине
зарегистрированного и оплаченного
уставного (складочного) капитала или
величине уставного фонда, имущества
```

founders Object Нет Сведения об учредителях

founders.individuals Array Да Физические лица

founders.individuals[].firstName String Да Имя

founders.individuals[].lastName String Да Фамилия

founders.individuals[].middleName String Нет Отчество

founders.individuals[].birthDate String Нет Дата рождения

founders.individuals[].birthPlace String Нет Место рождения

founders.individuals[].citizenship String Да Гражданство

founders.individuals[].docType String Нет

```
Вид документа, удостоверяющего
личность
```

founders.individuals[].docNumber String Нет Серия и номер документа

```
Наименование Тип Обязательность Описание
```

founders.individuals[].issueDate String Нет Дата выдачи

founders.individuals[].issuedBy String Нет Кем выдан

founders.individuals[].address String Да Адрес регистрации/адрес проживания

ceo Object Да Сведения о руководителе

ceo.firstName String Да Имя

ceo.lastName String Да Фамилия

ceo.middleName String Нет Отчество

ceo.birthDate String Нет Дата рождения

ceo.birthPlace String Нет Место рождения

ceo.docType String Нет

```
Вид документа, удостоверяющего
личность
```

ceo.docNumber String Нет Серия и номер документа

ceo.issueDate String Нет Дата выдачи

ceo.issuedBy String Нет Кем выдан

ceo.address String Нет Адрес регистрации/адрес проживания

ceo.phone String Да Контактный телефон

ceo.country String Да

```
Страна гражданства
3 символа по справочнику ISO 3166 - 1
(Alpha-3)
```

licenses Array Нет Лицензии

licenses[].type String Нет Вид

licenses[].number String Нет Номер

licenses[].issueDate String Нет Дата выдачи

licenses[].issuedBy String Нет Кем выдана

licenses[].expiryDate String Нет Срок действия

licenses[].description String Нет Перечень лицензируемой деятельности

siteUrl String Да Адрес интернет сайта

```
Наименование Тип Обязательность Описание
```

```
primaryActivities String Нет Основные виды деятельности
```

```
bankAccount Object Да
```

```
Реквизиты партнера магазина
Мультирасчетов для перечисления
возмещения
```

```
bankAccount.account String Да Расчетный или казначейский счет
```

```
bankAccount.korAccount String Нет Корреспондентский счет
```

```
bankAccount.bankName String Да Наименование банка
```

```
bankAccount.bik String Да БИК
```

```
bankAccount.kbk^5 String Нет
```

```
КБК. Если указан КБК, то «Статус
плательщика» присваивается Банком
автоматически
```

```
bankAccount.oktmo^5 String Нет ОКТМО
```

```
bankAccount.details String Да Назначение платежа
```

```
comment String Нет Комментарий
```

```
nonResident Boolean Нет Признак нерезидента. Всегда false
```

Примечание:

1. Если значение параметра mcc не равно mcc-коду, соответствующему переданной торговой группы
   (merchantIds), то значение merchantIds игнорируется, и точка зарегистрируется на ту торговую группу,
   которой соответствует значение параметра mcc.
2. Параметр name необходимо заполнить кириллицей и обязательно указать организационно-правовую
   форму (например ОАО, ЗАО, ИП).
3. В случае, если у регистрируемой точки нет КПП, то необходимо передать нули: 000000000.
4. В параметре addresses допустимы только символы («.» и «,»). При наличии других спецсимволов запрос
   отобьется ошибкой.
5. Параметры kbk и oktmo оба обязательны для заполнения, если указан 1 (один) из этих параметров.

Пример запроса

```
{
"serviceProviderEmail": "333@mail.ru",
"shopArticleId": "test_tochka",
"billingDescriptor": "test_tochka",
"fullName": "Общество с ограниченной ответственностью «Компания»",
"name": "ООО «Компания»",
"inn": "3333333333",
"kpp": "333333333",
"okved": "64.92.7",
"ogrn": 333333333333,
"regDepartment": "ФНС No 1 по г. Москве",
```

"regDate": "2003- 03 - 03",
"addresses": [
{
"type": "legal",
"zip": "108809",
"country": "RUS",
"city": "Москва",
"street": "Маяковского, 3",
"description": "Юридический адрес"
},
{
"type": "actual",
"zip": "108809",
"country": "RUS",
"city": "Москва",
"street": "Маяковского, 5"
}
],
"phones": [
{
"type": "common",
"phone": "+7(495)333-3333",
"description": "основной"
}
],
"email": "333@mail.ru",
"assets": "3000000",
"founders" : {
"individuals" : [ {
"firstName" : "Семен",
"lastName" : "Семенов",
"middleName" : "Семенович",
"birthDate" : "1970- 02 - 02",
"birthPlace" : "Рязань",
"citizenship" : "Россия",
"docType" : "Паспорт",
"docNumber" : "2222 222222",
"issueDate" : "2009- 07 - 21",
"issuedBy" : "Отделом УФМС России по Рязанской области",
"address" : "214031, г. Рязань, ул. Ленина, д. 1, кв. 1"
}, {
"firstName" : "Имя",
"lastName" : "Фамилия",
"middleName" : "Отчество",
"birthDate" : "1993- 01 - 01",
"birthPlace" : "г. Москва",
"citizenship" : "Россия",
"docType" : "Паспорт",
"docNumber" : "2222 333333",
"issueDate" : "2012- 09 - 13",
"issuedBy" : "Отделом УФМС России по гор. Москве",
"address" : "125413, г. Москва, ул.Ленина, д. 1, кв. 1"
} ]
},
"ceo": {
"address": "108809, г. Москва, Маяковского, 3",
"phone": "+79853333333",
"firstName": "Иван",
"lastName": "Иванов",
"middleName": "Иванович",
"birthDate": "1980- 03 - 03",
"birthPlace": "Москва",
"docType": "Паспорт",
"docNumber": "333 333333",
"issueDate": "2020- 09 - 16",
"issuedBy": "УМВД России по Московской области",
"country": "RUS"

```
},
"licenses": [ {
"type" : "type",
"number" : "3333-654",
"issueDate" : "2010- 01 - 01",
"issuedBy" : "issuedBy",
"expiryDate" : "2020- 01 - 01",
"description" : "лицензия продлена"
} ],
"siteUrl": "http://yandex.ru/",
"primaryActivities": "Торговля",
"bankAccount": {
"account": "40702810838170023076",
"korAccount": "30101810400000000225",
"bankName": "ПАО «Сбербанк России»",
"bik": "044525225",
"kbk": "18210501011011000110",
"oktmo": "45286575000",
"details": "Перевод средств по договору No 3333 - 3333 от 16.09.2021 по Реестру Операций от ${date}. Сумма комиссии
${rub} руб. ${kop} коп., НДС не облагается."
},
"comment": "Комментарий",
"nonResident": false
}
```

Ответ

Формат ответа: JSON

```
Таблица 1.3.2. Параметры ответа
```

```
Параметр Тип Описание
```

```
code String Код точки на стороне партнера. Значение, переданное в shopArticleId
```

```
shopCode String
```

```
Присвоенный идентификатор точки на стороне банка. Идентификатор
передается в параметре PartnerId при совершении ему выплаты (подробнее
в документации).
```

```
terminals Array
```

```
Массив объектов с информацией о зарегистрированных терминалах – для
точек магазина Мультирасчетов данный массив пустой.
```

Пример ответа:

```
{
"code": "test_tochka",
"shopCode": 111111111,
"terminals": []
}
```

При неуспешном ответе в объекте errors передается перечень ошибок валидации, которые были найдены в
переданном запросе.

```
Таблица 1.3. 3. Параметры неуспешного ответа
```

```
Наименование Тип Описание
```

```
field String Указывается имя параметра запроса, в котором допущена ошибка
```

```
defaultMessage String Сообщение об ошибке
```

```
rejectedValue String Указывается значение, переданное в запросе
```

```
code String Указывается тип формата, которому он не соответствует.
```

Существуют следующие причины ошибок:

- Ошибки валидации и формата сообщения
- Ошибки бизнес-логики

Примеры неуспешного ответа:

```
1) По причине бизнес-логики или по технических проблемам
{
"timestamp": "2018- 07 - 16T13:10:11.158+0000",
"status": 400,
"error": "Bad Request",
"message": "Ошибка регистрации точки billingDescriptor[shopArticleId]\nуказаны неверные банковские реквизиты. БИК :
044583999; р/с : 000000000000000000000",
"path": "/register"
}
```

Status заполняется http-кодом, которым завершился запрос. Если в ответе сообщения присутствует данный
параметр, то это означает, что регистрация точки завершилась ошибкой.

```
2) При ошибках формата сообщения
```

```
{
"timestamp": "2018- 07 - 25T13:23:18.160+0000",
"status": 400,
"error": "Bad Request",
"errors": [
{
"field": "billingDescriptor",
"defaultMessage": "не может быть пусто",
"rejectedValue": "",
"code": "NotEmpty"
},
{
"field": "serviceProviderEmail",
"defaultMessage": "email определен в неверном формате",
"rejectedValue": "bademeil",
"code": "Email"
},
{
"field": "billingDescriptor",
"defaultMessage": "должно соответствовать шаблону \"[A-z 0 - 9.\\-_ ]+\"",
"rejectedValue": "",
"code": "Pattern"
},
{
"field": "billingDescriptor",
"defaultMessage": "размер должен быть между 1 и 14",
"rejectedValue": "",
"code": "Size"
}
],
"message": "Validation failed for object='merchant'. Error count: 1",
"path": "/register"
}
```

### Перечень возможных ошибок

- Адрес не задан.
- The billingDescriptor is not specified
- Точка уже активирована.
- ShopArticleId не передан
- Параметр [name] не задaн.
- Параметр [inn] не задaн.
- Параметр [ogrn] не задaн.
- Параметр [address.zip] не задaн.
- Параметр [address.city] не задaн.
- Параметр [address.country] не задaн.
- Параметр [address.country] не задaн.
- Параметр [ceo.firstName] не задaн.
- Параметр [ceo.lastName] не задaн.
- Параметр [bankAccount] не задaн.
- Параметр назначение платежа не задано
- Параметр назначение платежа не задано
- The ShopArticleId is not specified
- Шаблон назначение платежа не задан
- Указаны неверные банковские реквизиты. БИК: ${bankAccount.bik}; р/с: ${bankAccount.account}
- Поле КБК не соответствует заданному шаблону: 20 цифр
- Поле КБК должно быть задано вместе с ОКТМО
- Поле ОКТМО не соответствует заданному шаблону: 8 или 11 цифр
- Поле ОКТМО должно быть задано вместе с КБК
- Ошибка регистрации точки. Параметр ogrn не задан

### 1.4. ПОЛУЧЕНИЕ ИНФОРМАЦИИ ПО ТОЧКЕ

Если при регистрации точки в ответе на запрос не были получены значения параметров mid, tid, необходимо
вызвать метод получения информации по точке.

Запрос

Тестовый URL: https://acqapi-test.tinkoff.ru/sm-register/register/shop/{shopCode}

Боевой URL: https://acqapi.tinkoff.ru/sm-register/register/shop/{shopCode}

\*Для возможности отправки запросов напишите на почту acq_help@tbank.ru c просьбой добавить ваши IP в
WL. После чего сможете отправлять запросы.

Метод: GET

```
Таблица 1.4.1. Параметры запроса
```

```
Наименование Тип Обязательность Описание
```

```
shopCode Integer Да
```

```
Идентификатор точки, полученный в ответе на запрос
регистрации точки
```

Ответ

Формат ответа: JSON
Таблица 1.4.2. Параметры ответа

```
Наименование Тип Обязательность Описание
```

```
merchantIds Array Нет Идентификаторы
агрегированных мерчантов
(торговые группы),
разрешенные для
использования торговой точкой
```

```
terminalIds Array Нет Идентификаторы терминалов,
разрешенные для
использования торговой точкой
```

```
terminalTypes Array Нет Тип терминала.
```

- 0 (non3DS),
- 1 (3DS)

```
mcc Integer Нет MCC-код торговой группы
(возвращается, если точка
подключена к 1 ТГ, иначе
значение возвращается в
массиве
paymentSystemAttributes)
```

```
name String Да Сокращенное наименование
организации
```

```
Наименование Тип Обязательность Описание
```

inn String Нет ИНН

kpp String Нет КПП

email String Да Email организации

bankAccount Object Да Реквизиты партнера агрегатора
для перечисления возмещения

bankAccount.account String Нет\* Расчетный счет

bankAccount.korAccount String Нет\* Корреспондентский счет

bankAccount.bankName String Нет\* Наименование банка

bankAccount.bik String Нет\* БИК

bankAccount.details String Нет\* Назначение платежа

userDefinedFees Object Да\*\* Пользовательские правила
задания комиссий в пользу
Предприятия

userDefinedFees.tax Object Да Комиссия

userDefinedFees.tax.percent Number Нет % от суммы операции

userDefinedFees.tax.min Number Нет Фиксированная минимальная
комиссия в расчетной валюте

userDefinedFees.tax.fix Integer
Number

```
Нет Фиксированная сумма в
расчетной валюте, безусловно
прибавляемая к комиссии
```

userDefinedFees.rule Object Да Правило применения комиссии

userDefinedFees. paymentSystem Number Нет Платежная система
0 (Visa)
1 (Mastercard)
2 (Mir)

userDefinedFees.terminalType Number Нет Тип терминала
0 (non- 3 DS)
1 (3DS)

userDefinedFees.tinkoffCard Boolean Нет Карта выпущена в Т-Банке

nonResident Boolean Нет Не резидент

userDefinedFees.rule.operationType Number Да Тип запроса:

- 0 (Pay)
- 1 (Fail pay)
- 2 (Account verification)

userDefinedFees.isAft Boolean Нет Комиссия за AFT операции

```
Наименование Тип Обязательность Описание
```

```
userDefinedFees.startDate String Нет Дата вступления комиссии в
силу, проверяется на нестрогое
неравенство
(формат yyyy-MM-dd hh:mm:ss)
```

```
bankAccount.userDefinedFees.endDat
e
```

```
String Нет Дата окончания действия
комиссии, проверяется на
строгое неравенство
(формат yyyy-MM-dd hh:mm:ss)
Если null, то применение
комиссии не ограничено сверху
```

```
bankAccount.disableReimbursement Boolean Да Возмещения заблокированы у
торговой точки
```

```
bankAccount.feeType String Да Тип комиссии:
```

- UP
- DOWN (default)

```
paymentSystemAttributes Array Нет Атрибуты точки для ПС
```

```
paymentSystemAttributes.mcc String Нет MCC-код торговой группы
```

```
paymentSystemAttributes.mid String Нет Уникальный МИД,
зарегистрированный в ПС
```

```
paymentSystemAttributes.tid String Нет Уникальный ТИД
```

- Не приходит, если в запросе на регистрацию не был передан bankAccount.

\*\* Обязателен только для BPA и BRS. В других случаях необязателен (в ответе будет возвращаться пустой
массив).

Пример ответа, если точка подключена к 1 торговой группе (merchantIds):

{
"merchantIds": [0000000000000],
"terminalIds": [0000000, 11111111],
"terminalTypes": [0,1],
"mcc": 6012,
"name": "OOO «Moya kompaniya»",
"inn": "1111111111",
"kpp": "111000001",
"email": "11@mail.ru",
"bankAccount": {
"account": "111111111111111111",
"korAccount": "111111111111111111",
"bankName": "ПАО «Сбербанк России»",
"bik": "11111111111",
"details": "Перевод средств по договору No 202210 - 11111 от 01.09.2021 по Реестру Операций от ${date}. Сумма комиссии
${rub} руб. ${kop} коп., НДС не облагается.",
"userDefinedFees": [
{
"tax": {
"percent": 1,
"min": 0
},
"rule": {
"operationType": 0
},
"isAFT": false,

"startDate": "2022- 03 - 03 21:07:57"
],
"disableReimbursement": false,
"feeType": "DOWN"
},
"paymentSystemAttributes": [
{
"mid": "200000001111111",
"tid": "11111111"
}
]
}

Пример ответа, если точка подключена к нескольким торговым группам (merchantIds):

{
"merchantIds": [0000000000000, 0000000000001],
"terminalIds": [0000000, 11111111, 0000001, 11111112],
"terminalTypes": [0,1, 0, 1],
"name": "OOO «Moya kompaniya»",
"inn": "1111111111",
"kpp": "111000001",
"email": "11@mail.ru",
"bankAccount": {
"account": "111111111111111111",
"korAccount": "111111111111111111",
"bankName": "ПАО «Сбербанк России»",
"bik": "11111111111",
"details": "Перевод средств по договору No 202210 - 11111 от 01.09.2021 по Реестру Операций от ${date}. Сумма комиссии ${rub} руб.
${kop} коп., НДС не облагается.",
"userDefinedFees": [
{
"tax": {
"percent": 1,
"min": 0
},
"rule": {
"operationType": 0
},
"isAFT": false,
"startDate": "2022- 03 - 03 21:07:57"
},
{
"tax": {
"percent": 1,
"min": 0
},
"rule": {
"operationType": 0
},
"isAFT": true,
"startDate": "2022- 03 - 03 21:07:57"
}
],
"disableReimbursement": false,
"feeType": "DOWN"
},
"paymentSystemAttributes": [
{
"mcc": "0000",
"mid": "200000001111111",
"tid": "11111111"
},
{
"mcc": "0001",
"mid": "200000001111111",
"tid": "11111111"
}

]
}

## 2. ОБНОВЛЕНИЕ ДАННЫХ ПО ПАРТНЕРУ

### 2.1. ОБЩАЯ ИНФОРМАЦИЯ

Сценарий действий для обновления информации о точке для партнера:

- Авторизация для использования API обновления информации о точках
- Обновление информации о точке
  Для обновления информации о точках магазина Мультирасчетов необходимо использовать API обновления
  информации о точках.
  Обновление информации о точке для партнера осуществляется вызовом методов с передачей параметров
  методом PATCH в формате JSON. Все методы и передаваемые параметры являются чувствительными к
  регистру.
  Для PATCH запроса в заголовке должен присутствовать Content-Type: application/json

Примечание: Требование про Content-Type: application/json выполняется не для всех POST-запросов.
Например, для запроса на /oauth/token мы используем формат form-data, а не JSON-код, поэтому и заголовок
в нем не нужен

Тестовый URL: https://acqapi-test.tinkoff.ru
Боевой URL: https://acqapi.tinkoff.ru

Для внешнего взаимодействия с сервисом необходимо обращаться по URL-адресам с использованием
сертификата mtls для acqapi.tinkoff.ru. Если у вас нет сертификата, то выпустите его по инструкции
https://developer.tbank.ru/docs/intro/manuals/certificates

Для возможности отправки запросов напишите на почту acq_help@tbank.ru c просьбой добавить ваши IP в
WL. После чего сможете отправлять запросы.

### 2.2. ОБНОВЛЕНИЕ ИНФОРМАЦИИ О ТОЧКЕ

### Запрос

Тестовый URL: https://acqapi-test.tinkoff.ru/sm-register/register/{shopCode}
Боевой URL: https://acqapi.tinkoff.ru/sm-register/register/{shopCode}

\*Для возможности отправки запросов с IP-адресов, которые находятся вне РФ, напишите на почту
acq_help@tbank.ru c просьбой добавить ваши IP в WL

Метод: PATCH

```
Таблица 2.2.1. Параметры запроса
```

```
Наименование Тип Обязательность Описание
```

```
bankAccount Object Нет
```

```
Реквизиты партнера магазина
Мультирасчетов для перечисления
возмещения
```

```
bankAccount.account String Да
```

```
Расчетный или казначейский счет
Не должен быть пустым, если задаются
реквизиты партнера магазина
Мультирасчетов для перечисления
возмещения
```

```
bankAccount.korAccount String Нет Корреспондентский счет
```

```
bankAccount.bankName String Да
```

```
Наименование банка
Не должен быть пустым, если задаются
реквизиты партнера магазина
Мультирасчетов для перечисления
возмещения
```

```
bankAccount.bik String Да
```

#### БИК

```
Не должен быть пустым, если задаются
реквизиты партнера магазина
Мультирасчетов для перечисления
возмещения
```

```
bankAccount.kbk String Нет
```

#### КБК

```
Если у точки есть КБК, то «Статус
плательщика» присваивается Банком
автоматически
```

```
bankAccount.oktmo String Нет ОКТМО
```

```
bankAccount.details String Да Назначение платежа
```

```
Наименование Тип Обязательность Описание
```

```
Не должен быть пустым, если задаются
реквизиты партнера магазина
Мультирасчетов для перечисления
возмещения
```

```
bankAccount.disableReimbursement Boolean Нет
```

```
Если значение False, то ТСП
разблокируется, и предыдущие холды
помечаются на выплаты при условии, если
ТСП ранее была заблокирована для выплат
Если значение True, то ТСП блокируется
для выплат, если ранее не была
заблокирована
```

Примечание:

1. Для очищения КБК и ОКТМО необходимо в значении обоих параметров передать null

Пример запроса

```
{
"bankAccount": {
"account": "40702810838170023076",
"korAccount": "30101810400000000225",
"bankName": "ПАО «Сбербанк России»",
"bik": "044525225",
"kbk": "18210501011011000110",
"oktmo": "45286575000",
"details": "Перевод средств по договору No 3333 - 3333 от 16.09.2021 по Реестру Операций от ${date}. Сумма комиссии
${rub} руб. ${kop} коп., НДС не облагается.",
"disableReimbursement": true
}
}
```

Ответ

Формат ответа: JSON

```
Таблица 2.2.2. Параметры ответа
```

```
Параметр Тип Описание
```

```
code String Код точки на стороне партнера. Значение, переданное в shopArticleId
```

```
shopCode String Присвоенный идентификатор точки на стороне банка
```

```
terminals Array
```

```
Массив объектов с информацией о зарегистрированных терминалах – для
точек магазина Мультирасчетов данный массив пустой.
```

Пример ответа:

```
{
"code": "test_tochka",
```

```
"shopCode": 111111111,
"terminals": []
}
```

При неуспешном ответе в объекте errors передается перечень ошибок валидации, которые были найдены в

переданном запросе.

```
Таблица 2.2. 3. Параметры неуспешного ответа
```

```
Наименование Тип Описание
```

```
field String Указывается имя параметра запроса, в котором допущена ошибка
```

```
defaultMessage String Сообщение об ошибке
```

```
rejectedValue String Указывается значение, переданное в запросе
```

```
code String Указывается тип формата, которому он не соответствует.
```

### Перечень возможных ошибок

- Ошибка обновления точки. Точка не найдена
- Указаны неверные банковские реквизиты
- Поле КБК не соответствует заданному шаблону: 20 цифр
- Ошибка обновления точки. Поле КБК должно быть задано вместе с ОКТМО
- Поле ОКТМО не соответствует заданному шаблону: 8 или 11 цифр
- Ошибка обновления точки. Поле ОКТМО должно быть задано вместе с КБК

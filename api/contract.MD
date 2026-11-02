REGISTRATION ENDPOINTS
CREATE USER:allows users to create an account on the platform
Method:POST/register
FRONTEND SENDS: name, password, email and an optional phone number, and email must be unique
SUCCESS REPORT:server sends back user name and email back with new user created with a status code of 201
ERROR1:user must fill missing fields with a status code of 400
ERROR2:email already exists with a status code of 409

LOGIN ENDPOINTS
LOGIN USER:allows user to log into the platform,
METHOD:post/login
FRONTEND SENDS:email and password
SUCCESS REPORT:server sends back token and user object containing name and id with status code of 200
ERROR1:user must fill all required fields with a status code of 400
ERROR2:invalid credentials with status code of 401

UPDATE PHONE NUMBER ENDPOINT
UPDATING:updates user phone number
METHOD:PATCH/users/:id
FRONTEND SENDS:user phone number
SUCCESS:server sends back the user object now containing the updated phone number with a status code of 200
ERROR1:enter a valid number format with status code of 400
ERROR2:you don't have access to update this user details with status of 403

TOKEN VERIFICATION
VERIFY:verifies the token of a logged in user
METHOD:GET/me
FRONTEND SENDS: header authorization with bearer and token
SUCCESS: sends back the user email and name and id with status code of 200
ERROR1:no token available with status code of 401
ERROR2:this token is invalid or expired with status code of 401

FIND NEARBY FACILITIES
WHAT IT DOES: finds hospitals and clinics near the user's coordinates, nearest first
METHOD AND PATH: GET /facilities
FRONTEND SENDS: query values in the URL, no body
  lat (required, number)
  lng (required, number)
  type (optional, "hospital" or "clinic"; leave it out to get both)
  radiusKm (optional, number from 1 to 50, default 10)
  example: /facilities?lat=9.0765&lng=7.3986&type=clinic&radiusKm=10
SUCCESS: 200 with an array, nearest first. Each item has:
  id, name, type, address, area, lat, lng, emergency, open24h, distanceKm
  Nothing nearby: 200 with an empty array []
ERRORS:
  400 "lat and lng are required" when either is missing
  400 "lat and lng must be valid coordinates" when they are not numbers or are out of range
  400 "type must be hospital or clinic"
  400 "radiusKm must be a number from 1 to 50"
  500 "something went wrong"
WHO CAN CALL IT: anyone, no token needed

AI CHATBOT
FUNCTION: lets a logged-in user chat with the AI and get a reply
METHOD: POST /chatbot
FRONTEND SEND:
  header: Authorization: Bearer
  body:
    message (string, required, 1 to 500 characters)
    conversationId (number, optional; leave it out to start a new chat)
    readings (array, optional, up to 20 recent readings from the browser; each has type and measuredAt, plus: heart_rate needs bpm; blood_pressure needs systolic and diastolic; blood_oxygen needs spo2 (50 to 100); body_temperature needs celsius (30 to 45))
SUCCESS: status 200
  { reply, conversationId, title }
ERROR:
  400 'please fill in the message box'
  400 'message must be a string'
  400 'message is too long'
  400 'readings must be a list of up to 20 readings'
  401 'no token available'
  401 'token is invalid'
  404 'conversation not found'
  500 'something went wrong'
  503 'ai is temporarily unavailable'


EMERGENCY SITUATIONS
AI must stop chatting when user starts experiencing:
.Chest pain or pressure, especially with sweating, arm or jaw pain, or breathlessness.
.Stroke signs: face drooping, arm weakness, slurred speech, or sudden confusion.
.Severe trouble breathing, or the user can’t speak full sentences.
.Blood pressure at or above 180/120.
.Resting heart rate above 130 or below 40.
.Blood oxygen at or below 90%.
.Body temperature at or above 39.5 C or at or below 35 C.
.AI must respond with get urgent help when user starts having thoughts of self harm

CONSENT TEXT
What the assistant does

It answers general health questions in plain language.
When readings are included with your message, it uses them to explain what they may mean.
It does not diagnose, prescribe, or replace a doctor. In an emergency, call your local emergency number or go to the nearest hospital.

Where your messages go

Your messages, and any readings sent with them, are sent over the internet to an AI provider (OpenRouter and the AI model behind it).
That provider may keep what it receives. Please don’t include your name, phone number, address or other identifying details.

What we store

Your conversations are saved in your Senzora account so you can see your chat history.
We do not sell your information or make it public. Keep this line only if it’s true for your project.

LIST SAVED CONVERSATIONS
FUNCTION: returns the logged-in user's past chats so the app can show a list and reopen one
METHOD: GET /conversations
FRONTEND SENDS: bearer token header, no body, no query values
SUCCESS: 200 with a bare array, newest first. Each item has id, title, createdAt. A user with no chats gets an empty array []
ONLY YOURS: a user only ever gets their own conversations, never anyone else's
ERROR1: no token available, status 401
ERROR2: this token is invalid or expired, status 401
ERROR3: something went wrong on the server, status 500

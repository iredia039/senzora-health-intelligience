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
    readings (array, optional, up to 20 recent readings from the browser; each has type, measuredAt, and either systolic and diastolic or bpm)
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
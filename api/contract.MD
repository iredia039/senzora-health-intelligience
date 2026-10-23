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
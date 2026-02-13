# Bruno API Collection - Codemania Backend

This Bruno collection contains API tests for the Codemania backend authentication system.

## Setup

1. **Install Bruno**: Download from [usebruno.com](https://www.usebruno.com/)
2. **Open Collection**: In Bruno, click "Open Collection" and select the `bruno-collection` folder
3. **Select Environment**: Choose "Local" environment from the dropdown

## Environment Variables

The Local environment is pre-configured with:
- `baseUrl`: http://localhost:5000
- `token`: Auto-populated after successful team login
- `adminToken`: Auto-populated after successful admin login

## Available Requests

### Auth Folder

1. **Team Register** - Register a new team
   - Method: POST
   - Endpoint: `/api/auth/register`
   - Auto-saves token on success

2. **Team Login** - Login with team name and access code
   - Method: POST
   - Endpoint: `/api/auth/login`
   - Default access code: `CODEMANIA2026`
   - Auto-saves token on success

3. **Get Me** - Get current team information
   - Method: GET
   - Endpoint: `/api/auth/me`
   - Uses saved team token

4. **Admin Login** - Admin authentication
   - Method: POST
   - Endpoint: `/api/auth/admin/login`
   - Auto-saves admin token on success

## Testing Flow

1. Start your backend server: `cd backend/core && npm start`
2. Run **Team Register** to create a test team
3. Run **Team Login** to authenticate (token is auto-saved)
4. Run **Get Me** to verify authentication works
5. Run **Admin Login** for admin access

## Notes

- Tokens are automatically saved to environment variables after successful login
- Update the `baseUrl` if your server runs on a different port
- Admin credentials default: username=`admin`, password=`admin123` (check your .env file)

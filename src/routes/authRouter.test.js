const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;


beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

test('bad register', async () => {
  const expectedUser = { ...testUser };
  delete expectedUser.email;
  const registerRes = await request(app).post('/api/auth').send(expectedUser);
  expect(registerRes.status).toBe(400)
  expect(registerRes.body.message).toEqual('name, email, and password are required')
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test('logout', async () => {
  //login in order to test logout functionality
  const loginRes = await request(app).put('/api/auth').send(testUser);
  let token = (loginRes.body.token)
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${token}`);
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toEqual('logout successful')
})

test('not logged in', async () => {
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer hi`);
  expect(logoutRes.status).toBe(401);
  expect(logoutRes.body.message).toEqual('unauthorized');
})

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}
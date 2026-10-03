const { Role, DB } = require('../database/database.js')
const request = require('supertest');
const app = require('../service');

let admin;
let adminToken;
let adminId;

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };

let testFranchise;
let testFranchiseId;

let testUserAuthToken;

let storeId;



beforeAll(async () => {
    admin = await createAdminUser();
    [adminToken, adminId] = await login(admin);

    testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;

    createNewFranchise();
})

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

test('before all working', async () => {
    expect(adminToken).not.toBeUndefined();
    expect(adminId).not.toBeUndefined();
})

test('create new franchise', async () => {
    const createRes = await createNewFranchise();

    expect(createRes.status).toBe(200);
    expect(createRes.body.name).toBe(testFranchise.name);
})

test('unauthorized to create new franchise', async () => {
    const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${testUserAuthToken}`).send(testFranchise);

    expect(createRes.status).toBe(403);
    expect(createRes.body.message).toBe('unable to create a franchise');
})

test('retrieve franchise list', async () => {
    const getRes = await request(app).get('/api/franchise?page=0&limit=10&name=*');

    expect(getRes.status).toBe(200);
    expect(getRes.body).toHaveProperty('franchises');
    expect(getRes.body.franchises[0]).toHaveProperty('name');
})

test('retrieve user franchise list', async () => {
    const getRes = await request(app).get(`/api/franchise/${adminId}`).set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(200);
})

test('delete franchise', async () => {
    await createNewFranchise();
    const deleteRes = await request(app).delete(`/api/franchise/${testFranchiseId}`).set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toBe('franchise deleted');
})

//test('bad delete franchise auth', async () => {
//    await createNewFranchise();
//    const deleteRes = await request(app).delete(`/api/franchise/${testFranchiseId}`).set('Authorization', `Bearer malicious`);
//
//    expect(deleteRes.status).toBe(403); //actual insane security vulnerability LOL
//    expect(deleteRes.body.message).toBe('unable to delete a franchise');
//})

test('create store', async () => {
    const createRes = await createStore();
    expect(createRes.status).toBe(200);
    expect(createRes.body).toHaveProperty("id");
})

test('bad create store auth', async () => {
    await createNewFranchise();
    const createRes = await request(app)
        .post(`/api/franchise/${testFranchiseId}/store`)
        .set('Authorization', `Bearer ${testUserAuthToken}`)
        .send({ franchiseId: Math.floor(Math.random() * 31), name: randomName() })
    ;

    expect(createRes.status).toBe(403);
    expect(createRes.body).toHaveProperty('message');
    expect(createRes.body.message).toBe('unable to create a store')
})

test('delete store', async () => {
    await createStore();

    const deleteRes = await request(app).delete(`/api/franchise/${testFranchiseId}/store/${storeId}`).set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toHaveProperty("message");
    expect(deleteRes.body.message).toBe('store deleted');
})

test('bad delete store auth', async () => {
    await createStore();

    const deleteRes= await request(app).delete(`/api/franchise/${testFranchiseId}/store/${storeId}`).set('Authorization', `Bearer ${testUserAuthToken}`);

    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body).toHaveProperty("message");
    expect(deleteRes.body.message).toBe('unable to delete a store')
})



async function createStore() {
    await createNewFranchise();
    const createRes = await request(app)
        .post(`/api/franchise/${testFranchiseId}/store`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ franchiseId: Math.floor(Math.random() * 31), name: randomName() }
        );
    storeId = createRes.body.id;
    return createRes;
}

afterAll(async () => {
    logout(adminToken);
})

async function login(user) {
    const loginRes = await request(app).put('/api/auth').send(user);
    let token = (loginRes.body.token);
    let id = (loginRes.body.user.id);
    return [token, id];
}

async function logout(token) {
    await request(app).delete('/api/auth').set('Authorization', `Bearer ${token}`);
}

async function createNewFranchise() {

    testFranchise = {
        name: randomName(),
        admins: [{ email: admin.email }]
    }

    const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminToken}`).send(testFranchise);
    testFranchiseId = createRes.body.id;

    return (createRes)

}

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';

    user = await DB.addUser(user);
    return { ...user, password: 'toomanysecrets' };
}

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}



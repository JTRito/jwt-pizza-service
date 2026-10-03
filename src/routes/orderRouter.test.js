const { Role, DB } = require('../database/database.js')
const request = require('supertest');
const app = require('../service');

let admin;
let adminToken;


const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };

let testFranchise;
let testFranchiseId;

let testUserAuthToken;

let storeId;

beforeAll(async () => {
    admin = await createAdminUser();
    adminToken= await login(admin);

    testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;

    await createStore();
})

test('get menu', async () => {
    const getRes = await request(app).get('/api/order/menu');

    expect(getRes.status).toBe(200);
    expect(getRes.body[0]).toHaveProperty('title');
})

test('add item to menu', async () => {
    const menuItem = {
        title: randomName(), description: randomName(), "image": "pizza9.png", "price": Math.random()
    }

    const putRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${adminToken}`).send(menuItem);

    expect(putRes.status).toBe(200);
})

test('unauthorized to add to menu', async () => {
    const menuItem = {
        title: randomName(), description: randomName(), "image": "pizza9.png", "price": Math.random()
    }

    const putRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${testUserAuthToken}`).send(menuItem);

    expect(putRes.status).toBe(403);
    expect(putRes.body.message).toBe('unable to add menu item');
})

test('create order', async () => {
    const order = {
        franchiseId : testFranchiseId,
        storeId : storeId,
        items: [{
            menuId: 1,
            description: "Veggie",
            price: 0.05
        }]
    }

    const postRes = await request(app).post('/api/order').set('Authorization', `Bearer ${testUserAuthToken}`).send(order);

    expect(postRes.status).toBe(200);
    expect(postRes.body).toHaveProperty('order');
})

afterAll(async () => {
    await logout(adminToken);
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
import cluster from 'node:cluster';
import server from '../src/server.js';
import config from './config/index.js';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert';
import { CORS, DEFAULT_TIMEOUT } from './config/routes/index.js';
import { TIMEOUT } from './config/routes/timeout.js'
import { MAX_FILES } from './config/routes/file.js';


server(config);

// middleware +
// endpoint +
// modules:
//  timeout +
//  cors +
//  dao +
//  storage ?
//  uploads +
//  compression
//  statics
//  session
//  roles
//  cache
//  rpc

if (cluster.isPrimary) {

    setTimeout(() => {
        describe('api tests', () => {

            const BASE_URL = `http://${config.api.host}:${config.api.port}`;

            it('middleware test', { skip: true }, async () => {
                const CONFIGURED_COOKIE = 'middleware-test=ok';
                const route = '/';
                try {
                    const response = await fetch(BASE_URL + route);
                    const headers = response.headers;
                    const cookies = headers.getSetCookie();
                    let midlw_cookie = cookies.filter((cookie) => cookie.match(CONFIGURED_COOKIE + '.*'));
                    assert.ok(midlw_cookie);
                } catch (error) {
                    console.log(error.message);
                    assert.fail('Error occured during the request to the server');
                }
            });

            it('endpoint test', { skip: true }, async () => {
                const route = '/api/state';
                const id = 'my_id'
                const data = 'some data here...'
                try {
                    let response = await fetch(BASE_URL + route + '/' + id, {
                        method: 'POST',
                        body: data
                    });
                    if (response.status !== 200) {
                        console.log(await response.text());
                        assert.fail();
                    }
                    const res_id = JSON.parse(await response.text()).params.id;
                    assert.strictEqual(res_id, id);
                } catch (error) {
                    console.log(error.message);
                    assert.fail('Error occured during the request to the server');
                }
            });

            it('dao test', { skip: true }, async () => {
                const route = '/api/user';
                let data = JSON.stringify({
                    'username': 'NutonFlash',
                    'admin': 'guest'
                });
                let headers = new Headers();
                headers.append('Content-Type', 'application/json');
                try {
                    // create user
                    let response = await fetch(BASE_URL + route, {
                        method: 'POST',
                        body: data,
                        headers
                    });
                    if (response.status != 200) {
                        console.log(await response.text());
                        assert.fail();
                    }
                    const user = await response.json();
                    // update user
                    const new_username = 'meefik';
                    const new_first_name = 'Anton';
                    const new_last_name = 'Skshidlevsky';
                    // how to use select in update?
                    // 'select=first_name';
                    data = JSON.stringify({
                        username: new_username,
                        first_name: new_first_name,
                        last_name: new_last_name
                    })
                    response = await fetch(BASE_URL + route + '/' + user.id, {
                        method: 'PUT',
                        body: data
                    });
                    if (response.status != 200) {
                        console.log(await response.text());
                        assert.fail();
                    }
                    // get user
                    const query = 'select=first_name,username';
                    response = await fetch(BASE_URL + route + '/' + user.id + '?' + query, {
                        method: 'GET'
                    });
                    if (response.status != 200) {
                        console.log(await response.text());
                        assert.fail();
                    }
                    const res_data = await response.json();
                    assert.strictEqual(res_data.username, new_username);
                    // delete user
                    response = await fetch(BASE_URL + route + '/' + user.id, {
                        method: 'DELETE'
                    });
                    if (response.status != 200) {
                        console.log(await response.text());
                        assert.fail();
                    }
                } catch (error) {
                    console.log(error.message);
                    assert.fail('Error occured during the request to the server');
                }
            });

            it('cors test', { skip: true }, async () => {
                const CONFIGURED_CORS = CORS;
                try {
                    const response = await fetch(BASE_URL + '/');
                    const cors = response.headers.get('access-control-allow-origin');
                    console.log(cors);
                    assert.strictEqual(cors, CONFIGURED_CORS);
                } catch (error) {
                    console.log(error.message);
                    assert.fail('Error occured during the request to the server');
                }
            });

            it('timeout test', { skip: true }, async () => {
                const CONFIGURED_TIMEOUT = DEFAULT_TIMEOUT;
                const ENDPOINT_DELAY = TIMEOUT;
                const route = '/api/timeout';
                try {
                    const response = await fetch(BASE_URL + route);
                    ENDPOINT_DELAY > CONFIGURED_TIMEOUT ?
                        assert.fail() :
                        console.log(await response.text());
                } catch (error) {
                    console.log(error.message);
                    ENDPOINT_DELAY > CONFIGURED_TIMEOUT ?
                        console.log('Error occured during the request to the server') :
                        assert.fail('Error occured during the request to the server');
                }
            });

            describe('uploads test', () => {
                const route = '/api/file/local';
                const blobs = [];
                for (let i = 0; i < MAX_FILES + 1; i++) {
                    const blob = new Blob(['Some file content...'], { type: 'plain/text' });
                    blobs.push(blob);
                }
                it('correct upload test', { skip: true }, async () => {
                    const data = new FormData();
                    const files = blobs.slice(0, -1);
                    for (const file of files) {
                        data.append('upload', file);
                    }
                    try {
                        const response = await fetch(BASE_URL + route, {
                            method: 'post',
                            body: data
                        });
                        if (response.status != 200) {
                            console.log(await response.text());
                            assert.fail('File wasn\'t saved due to some error');
                        }
                        const jsonRes = await response.json();
                        assert.strictEqual(jsonRes.fileSaved, MAX_FILES);
                    } catch (error) {
                        console.log(error.message);
                        assert.fail('Error occured during the request to the server');
                    }
                });

                it('limits exceeded upload test', { skip: true }, async () => {
                    const data = new FormData();
                    const files = blobs;
                    for (const file of files) {
                        data.append('upload', file);
                    }
                    try {
                        const response = await fetch(BASE_URL + route, {
                            method: 'post',
                            body: data
                        });
                        if (response.status == 200) {
                            console.log(await response.text());
                            assert.fail('Files were saved, wrong api behaviour');
                        }
                    } catch (error) {
                        console.log(error.message);
                        assert.fail('Error occured during the request to the server');
                    }
                });

                it('incorrect data type test', { skip: true }, async () => {
                    const data = JSON.stringify({
                        say: 'Hello!'
                    });
                    try {
                        const response = await fetch(BASE_URL + route, {
                            method: 'post',
                            body: data
                        });
                        if (response.status == 200) {
                            console.log(await response.text());
                            assert.fail('Wrong data type was accepted, incorrect api behaviour');
                        }
                    } catch (error) {
                        console.log(error.message);
                        assert.fail('Error occured during the request to the server');
                    }
                });
            });

            describe('storage test', () => {
                const route = '/api/file';
                const fileName = 'myfile';
                const fileContent = 'Some file content...';

                it('upload to storage test', { skip: true }, async () => {
                    const file = new Blob([fileContent], { type: 'plain/text' });
                    const data = new FormData();
                    data.append('upload', file);
                    try {
                        const response = await fetch(BASE_URL + route + '/' + fileName, {
                            method: 'POST',
                            body: data
                        });
                        if (response.status != 200) {
                            assert.fail('Error occured during saving file in storage');
                        }
                    } catch (error) {
                        console.log(error.message);
                        assert.fail('Error occured during the request to the server');
                    }
                });

                it('download from storage test', async () => {
                    try {
                        const response = await fetch(BASE_URL + route + '/' + fileName, {
                            method: 'GET'
                        });
                        if (response.status != 200) {
                            console.log(await response.text());
                            assert.fail('Error occured during downloading file from storage');
                        }
                        const blob = await response.blob();
                        assert.strictEqual(await blob.text(), fileContent);
                    } catch (error) {
                        console.log(error.message);
                        assert.fail('Error occured during the request to the server');
                    }
                });
            });

            it('compression test', { skip: true }, async () => {
                const CONFIGURED_TIMEOUT = DEFAULT_TIMEOUT;
                const ENDPOINT_DELAY = TIMEOUT;
                const route = '/api/timeout';
                try {
                    const response = await fetch(BASE_URL + route);
                    ENDPOINT_DELAY > CONFIGURED_TIMEOUT ?
                        assert.fail() :
                        assert.ok(await response.text());
                } catch (error) {
                    console.log(error.message);
                    ENDPOINT_DELAY > CONFIGURED_TIMEOUT ?
                        console.log('Error occured during the request to the server') :
                        assert.fail('Error occured during the request to the server');
                }
            });
        });
    }, 10000);
}
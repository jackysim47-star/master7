// Based on the already-run .94 baseline guard; HTTP entry points are explicit.
// Synthetic fetch implementations supplied by fixtures still work.
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import http2 from 'node:http2';
import dgram from 'node:dgram';
import {syncBuiltinESMExports} from 'node:module';
import {appendFileSync} from 'node:fs';
function denied(kind){
  if(process.env.MASTER7_TEST_GUARD_LOG)appendFileSync(process.env.MASTER7_TEST_GUARD_LOG,JSON.stringify({kind})+'\n');
  throw new Error('LOCAL_TEST_NETWORK_DISABLED:'+kind);
}
globalThis.fetch=async()=>denied('fetch');
net.Socket.prototype.connect=function(){return denied('socket.connect');};
net.connect=net.createConnection=()=>denied('net.connect');
tls.connect=()=>denied('tls.connect');
http.request=http.get=()=>denied('http.request');
https.request=https.get=()=>denied('https.request');
http2.connect=()=>denied('http2.connect');
dgram.createSocket=()=>denied('dgram.createSocket');
dns.lookup=()=>denied('dns.lookup');
dns.promises.lookup=async()=>denied('dns.promises.lookup');
globalThis[Symbol.for('master7.networkGuard')]=true;
syncBuiltinESMExports();

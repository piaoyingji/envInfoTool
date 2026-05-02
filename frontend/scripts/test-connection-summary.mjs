import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const sourcePath = path.resolve('src/lib/connectionSummary.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

const module = { exports: {} };
vm.runInNewContext(compiled, { module, exports: module.exports }, { filename: sourcePath });
const { buildConnectionSummary } = module.exports;

const organizations = [
  {
    id: 'org-1',
    code: '0528',
    name: '大分大学',
    vpnGuides: [
      {
        id: 'vpn-1',
        organization_id: 'org-1',
        name: 'GlobalProtect Portal',
        rawText: '',
        workflow: [],
        tags: ['VPN', '申请必要'],
        sourceFiles: [
          { id: 'file-1', sha256: 'abc', filename: 'vpn-guide.pdf', sizeBytes: 1000 },
        ],
      },
    ],
    environments: [
      { id: 'env-1', vpn_required: true, vpn_guide_id: 'vpn-1', tags: [], appServers: [], remoteConnections: [] },
      { id: 'env-2', vpn_required: false, tags: [{ name: '専用線', source: 'manual' }], appServers: [], remoteConnections: [] },
      { id: 'env-3', vpn_required: false, tags: [], appServers: [], remoteConnections: [] },
    ],
  },
];

const summary = buildConnectionSummary(organizations);

assertEqual(summary.total, 3, 'total environments');
assertEqual(summary.vpn, 1, 'vpn environments');
assertEqual(summary.dedicated, 1, 'dedicated-line environments');
assertEqual(summary.direct, 1, 'direct environments');
assertEqual(summary.guides.length, 1, 'vpn guide rows');
assertEqual(summary.guides[0].usedBy, 1, 'guide usage');
assertEqual(summary.guides[0].requestRequired, true, 'request-required tag');
assertEqual(summary.files.length, 1, 'source file rows');

console.log('connectionSummary tests passed');

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

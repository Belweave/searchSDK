#!/usr/bin/env python3
"""Offline C operation descriptors from retained provider tables and schemas.

Reads only shared inputs, writes only packages/c. No upstream emitter execution,
network, dependencies, timestamps, or changes to TypeScript generated files.
"""
import argparse
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parents[1]
A = ROOT / 'scripts/providers-a'
B = ROOT / 'scripts/providers-b'
INPUTS = {}


def read(path):
    data = path.read_bytes()
    INPUTS[str(path.relative_to(ROOT))] = hashlib.sha256(data).hexdigest()
    return json.loads(data)


def resolve(doc, value):
    seen = set()
    while isinstance(value, dict) and '$ref' in value:
        ref = value['$ref']
        if not ref.startswith('#/') or ref in seen:
            raise ValueError(f'Non-local/cyclic parameter reference: {ref}')
        seen.add(ref)
        value = doc
        for part in ref[2:].split('/'):
            value = value[part.replace('~1', '/').replace('~0', '~')]
    return value


def params(doc, item, op):
    out = []
    for value in item.get('parameters', []) + op.get('parameters', []):
        p = resolve(doc, value)
        if p['name'].lower() in ('authorization', 'x-api-key', 'x-subscription-token'):
            continue
        schema = resolve(doc, p.get('schema', {}))
        out.append({'name': p['name'], 'in': p['in'],
                    'required': p.get('required', False),
                    'type': schema.get('type'), 'enum': schema.get('enum'),
                    'explode': p.get('explode', True),
                    'style': p.get('style', 'form'),
                    'itemsType': resolve(doc, schema.get('items', {})).get('type')})
    return out


def metadata(provider, doc, item, op):
    rb = resolve(doc, op.get('requestBody', {}))
    content = rb.get('content', {})
    body = content.get('application/json', {}).get('schema')
    raw = bool(content) and body is None
    props = resolve(doc, body or {}).get('properties', {})
    return {'parameters': params(doc, item, op),
            'bodyRequired': bool(rb.get('required', False)),
            'bodyMode': 'raw' if raw else 'json' if body is not None else 'none',
            'contentType': next(iter(content), None),
            'stream': 'stream' in props or any('text/event-stream' in resolve(doc, r).get('content', {}) and 'application/json' in resolve(doc, r).get('content', {}) for status, r in op.get('responses', {}).items() if str(status).startswith('2')), 'streamValue': False,
            'headers': {}}


def verify_manifests():
    for directory in (A, B):
        manifest = read(directory / 'provenance.json')
        for source in manifest['sources']:
            filename = source.get('artifact', source.get('file'))
            digest = source.get('artifactSha256', source.get('sha256'))
            if filename and digest:
                path = directory / filename
                actual = hashlib.sha256(path.read_bytes()).hexdigest()
                INPUTS[str(path.relative_to(ROOT))] = actual
                if actual != digest:
                    raise ValueError(f'Retained source digest mismatch: {path}')


def generate():
    verify_manifests()
    operations = []
    for original in read(A / 'operations.json')['operations']:
        o = {k: original[k] for k in ('provider', 'name', 'path', 'source')}
        o.update(method=original['verb'], base=original['base'], mode=original['mode'])
        key = original.get('key')
        if key:
            doc = read(A / 'fixtures' / (key + '.json'))
            if key.startswith('brave-'):
                op = {'parameters': doc['queryParams'] + doc['headerParams'] + doc['pathParams']}
                if doc.get('requestBody'):
                    rb = doc['requestBody']
                    op['requestBody'] = {'required': rb['required'], 'content': {'application/json': {'schema': rb['schema']}}}
                doc = {'components': {'schemas': doc['schemas']}}
                item = {}
            else:
                path = o['path']
                # Exa Websets has an operation-specific server and relative paths.
                candidates = [path, '/websets' + path]
                candidates += [p for p in doc['paths'] if p.endswith(path) and original['verb'].lower() in doc['paths'][p]]
                match = next((p for p in candidates if p in doc['paths'] and original['verb'].lower() in doc['paths'][p]), None)
                if match is None:
                    raise ValueError(f'No schema for {o}')
                item = doc['paths'][match]
                op = item[original['verb'].lower()]
            m = metadata(o['provider'], doc, item, op)
            m.update(headers=original.get('headers', {}),
                     bodyRequired=original.get('raw', False) or original.get('bodyRequired', m['bodyRequired']),
                     stream=original.get('streamfield', False),
                     streamValue=original.get('streamvalue', False))
            for p in m['parameters']:
                if p['in'] == 'query' and (o['provider'] == 'context' and p['type'] == 'array' or o['provider'] == 'brave' and o['name'] == 'search' and p['name'] == 'result_filter'):
                    p['explode'] = False
        else:
            m = {'parameters': [], 'bodyMode': 'none', 'bodyRequired': False, 'headers': {}, 'stream': False, 'streamValue': False}
            if o['provider'] == 'context':
                m['parameters'] = [{'name': n, 'in': 'query', 'type': 'string', 'required': n in ('publicClientId', 'domain'), 'enum': e} for n, e in [('publicClientId', None), ('domain', None), ('theme', ['light', 'dark']), ('type', ['icon', 'wordmark'])]]
                m['strictQuery'] = True
            if o['name'] == 'paidSearch':
                m.update(bodyMode='json', bodyRequired=True)
        o['metadata'] = m
        operations.append(o)

    snapshot_sets = {
        'parallel': ['parallel-openapi'], 'linkup': ['linkup-openapi'],
        'firecrawl': ['firecrawl-openapi'], 'wondersearch': ['wonder-openapi'],
        'serper': ['serper-openapi', 'serper-scrape'],
        'you': ['you-' + n for n in ['web-search', 'contents', 'answer', 'research', 'finance-research', 'billing', 'images']],
        'perplexity': ['p-openapi'] + ['p-' + n + '.json' for n in ['gateway-chat', 'gateway-responses', 'gateway-messages', 'gateway-models', 'gateway-model', 'auth-generate', 'auth-revoke']],
    }
    for catalog in sorted((B / 'catalogs').glob('*-operations.json')):
        provider = catalog.name.removesuffix('-operations.json')
        docs = [read(B / 'snapshots' / f) for f in snapshot_sets.get(provider, [])]
        for row in read(catalog):
            if provider == 'serpapi':
                m = {'parameters': [], 'bodyMode': 'raw' if row['name'] == 'uploadImage' else 'none', 'bodyRequired': row['name'] == 'uploadImage', 'headers': {}, 'stream': False, 'streamValue': False}
                base = 'https://serpapi.com'
                if '{search_id}' in row['path']:
                    m['parameters'].append({'name': 'search_id', 'in': 'path', 'required': True, 'type': 'string'})
                if row['name'] in ('search', 'searchHtml', 'searchMarkdown', 'searchPixelPositions'):
                    m['parameters'].append({'name': 'engine', 'in': 'query', 'required': True, 'type': 'string'})
            else:
                matches = [(d, d['paths'][row['path']]) for d in docs if row['path'] in d.get('paths', {}) and row['method'].lower() in d['paths'][row['path']]]
                if len(matches) != 1:
                    raise ValueError(f'Ambiguous schema for {provider} {row}')
                doc, item = matches[0]
                op = item[row['method'].lower()]
                base = doc['servers'][0]['url'].rstrip('/')
                m = metadata(provider, doc, item, op)
                m['streamValue'] = row['response'] == 'sse'
            operations.append({'provider': provider, 'name': row['name'], 'method': row['method'], 'base': base, 'path': row['path'], 'mode': row['response'], 'source': row['source'], 'metadata': m})
    operations.sort(key=lambda o: (o['provider'], o['name']))
    if len(operations) != 493 or len({(o['provider'], o['name']) for o in operations}) != 493:
        raise ValueError('Expected 493 unique retained operations')
    # Native method aliases retain their catalog identity; wire behavior follows source.
    for o in operations:
        if o['provider'] == 'serpapi' and o['name'] in ('google', 'extract', 'extractMarkdown'):
            o['metadata']['fixedEngine'] = 'google' if o['name'] == 'google' else 'extract'
        if o['provider'] == 'serper' and o['method'] == 'GET':
            o['metadata']['credentialQuery'] = 'apiKey'
        elif o['provider'] == 'serpapi' and o['name'] != 'locations' and o['method'] == 'GET':
            o['metadata']['credentialQuery'] = 'api_key'
        o['metadata']['noAutomaticReplay'] = True
    catalog = {'schemaVersion': 1, 'sourceDate': '2026-10-22', 'operations': operations}
    manifest = {'generator': 'packages/c/scripts/generate.py', 'inputs': dict(sorted(INPUTS.items()))}
    quote = lambda x: json.dumps(x, ensure_ascii=True, separators=(',', ':'))
    code = ['/* Generated by scripts/generate.py. DO NOT EDIT. Source attribution: operations.json. */', '#include "internal.h"', '#include <searchsdk/native.h>', 'static const ssk_operation operations[]={']
    header = ['/* Generated from retained provider tables; see operations.json and sources.json. */', '#ifndef SEARCHSDK_NATIVE_H', '#define SEARCHSDK_NATIVE_H', '#include "searchsdk.h"', '#ifdef __cplusplus', 'extern "C" {', '#endif']
    functions = []
    for index, o in enumerate(operations):
        fields = [o[k] for k in ('provider', 'name', 'method', 'base', 'path', 'mode', 'source')]
        # Omit default/null parameter annotations in compiled metadata to keep each
        # string within C11's guaranteed literal size. Full catalog stays retained.
        wire = dict(o['metadata'])
        wire['parameters'] = [{k: v for k, v in p.items() if v is not None and not (k in ('required',) and v is False) and not (k == 'explode' and v is True) and not (k == 'style' and v == 'form')} for p in wire['parameters']]
        encoded = quote(wire)
        if len(encoded.encode()) > 4095:
            raise ValueError('Compiled operation metadata exceeds C11 string bound')
        fields.append(encoded)
        code.append(' {' + ','.join(quote(v) for v in fields) + '},')
        name = 'ssk_op_' + o['provider'] + '_' + o['name']
        header.append('const ssk_operation *' + name + '(void);')
        functions.append('const ssk_operation *' + name + '(void){return &operations[' + str(index) + '];}')
    code += ['};', 'size_t ssk_operation_count(void){return sizeof(operations)/sizeof(operations[0]);}', 'const ssk_operation *ssk_operation_at(size_t i){return i<ssk_operation_count()?&operations[i]:NULL;}', 'const ssk_operation *ssk_operation_find(const char *p,const char *n){if(p&&n)for(size_t i=0;i<ssk_operation_count();i++)if(!strcmp(p,operations[i].provider)&&!strcmp(n,operations[i].name))return &operations[i];return NULL;}', *functions, '']
    header += ['#ifdef __cplusplus', '}', '#endif', '#endif', '']
    return {'src/operations.c': '\n'.join(code), 'include/searchsdk/native.h': '\n'.join(header), 'operations.json': json.dumps(catalog, indent=2, ensure_ascii=False) + '\n', 'sources.json': json.dumps(manifest, indent=2) + '\n'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    for filename, expected in generate().items():
        path = HERE / filename
        if args.check:
            if not path.exists() or path.read_text() != expected:
                raise SystemExit(f'Stale generated file: {path}')
        else:
            path.write_text(expected)
    print('C catalog: 493 operations; ' + ('check passed' if args.check else 'generated'))


if __name__ == '__main__':
    main()

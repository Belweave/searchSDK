"""Conservative C++17 wire types from retained OpenAPI. Never executes other emitters."""
import copy
import hashlib
import json
import re

KEYWORDS = set('alignas alignof and and_eq asm atomic_cancel atomic_commit atomic_noexcept auto bitand bitor bool break case catch char char16_t char32_t class compl concept const constexpr const_cast continue co_await co_return co_yield decltype default delete do double dynamic_cast else enum explicit export extern false float for friend goto if inline int long mutable namespace new noexcept not not_eq nullptr operator or or_eq private protected public register reinterpret_cast requires return short signed sizeof static static_assert static_cast struct switch synchronized template this thread_local throw true try typedef typeid typename union unsigned using virtual void volatile wchar_t while xor xor_eq'.split())


def pas(name):
    return ''.join(part[0].upper() + part[1:] for part in re.split(r'[^A-Za-z0-9]+', name) if part)


def ident(name):
    name = re.sub('[^A-Za-z0-9_]', '_', name)
    if not name or name[0].isdigit() or name.startswith('_'):
        name = 'field_' + name.lstrip('_')
    return name + '_' if name in KEYWORDS else name


class Schemas:
    def __init__(self, root, read, classes):
        self.root, self.read, self.classes = root, read, classes
        self.docs = {}
        self.live_documents = []
        self.document_ids = {}
        self.definitions, self.aliases, self.names, self.active = [], [], {}, set()
        self.types = {}
        self.fallbacks = 0
        self.typed_operations = 0

    def scope(self, doc):
        # Keep converted Brave/supplemental documents alive; Python may otherwise
        # reuse their object IDs and incorrectly intern schemas across sources.
        if id(doc) not in self.document_ids:
            self.document_ids[id(doc)] = len(self.live_documents)
            self.live_documents.append(doc)
        return self.document_ids[id(doc)]

    def doc(self, path):
        key = str(path)
        if key not in self.docs:
            self.docs[key] = self.read(path)
        return self.docs[key]

    def resolve(self, schema, doc, seen=None):
        seen = set() if seen is None else seen
        while isinstance(schema, dict) and '$ref' in schema:
            ref = schema['$ref']
            if not ref.startswith('#/') or ref in seen:
                return {}
            seen.add(ref)
            value = doc
            for key in ref[2:].split('/'):
                value = value[key.replace('~1', '/').replace('~0', '~')]
            schema = {**value, **{k: v for k, v in schema.items() if k != '$ref'}}
        return schema

    def object_shape(self, schema, doc, depth=0):
        if depth > 30:
            return None
        schema = self.resolve(schema, doc)
        if not isinstance(schema, dict):
            return None
        if any(k in schema for k in ('anyOf', 'oneOf')):
            key = 'oneOf' if 'oneOf' in schema else 'anyOf'
            alternatives = []
            for part in schema[key]:
                resolved = self.resolve(part, doc)
                if isinstance(resolved, dict) and set(resolved) <= {'required', 'description'} and schema.get('properties'):
                    alternatives.append({'type':'object','properties':schema['properties'],'required':resolved.get('required',[])})
                else:
                    alternatives.append(self.object_shape(part, doc, depth+1))
            if any(s is None for s in alternatives):
                return None
            # Project common fields and optional variant fields; ambiguous field types remain Json.
            props = {}
            required = set(alternatives[0].get('required', [])) if alternatives else set()
            for alt in alternatives:
                required &= set(alt.get('required', []))
                for field, value in alt.get('properties', {}).items():
                    if field in props and props[field] != value:
                        props[field] = {}
                    else:
                        props[field] = value
            for field, value in schema.get('properties', {}).items():
                props[field] = value
            required |= set(schema.get('required', []))
            return {'type': 'object', 'properties': props, 'required': sorted(required), 'x-cpp-union-projection': True}
        if 'allOf' in schema:
            props = dict(schema.get('properties', {}))
            required = set(schema.get('required', []))
            for part in schema['allOf']:
                resolved = self.resolve(part, doc)
                # Required-only constraints refine the enclosing object.
                if isinstance(resolved, dict) and set(resolved) <= {'required', 'description'}:
                    required |= set(resolved.get('required', []))
                    continue
                shape = self.object_shape(resolved, doc, depth+1)
                if shape is None:
                    return None
                for key, value in shape.get('properties', {}).items():
                    if key in props and props[key] != value:
                        props[key] = {}
                    else:
                        props[key] = value
                required |= set(shape.get('required', []))
            return {'type': 'object', 'properties': props, 'required': sorted(required)}
        if schema.get('type') == 'object' or 'properties' in schema:
            return schema
        return None

    def typ(self, schema, doc, hint, prefix, depth=0):
        if not isinstance(schema, dict) or not schema or depth > 30:
            self.fallbacks += 1
            return 'Json'
        if '$ref' in schema:
            ref = schema['$ref']
            key = ('ref', self.scope(doc), ref)
            if key in self.active:
                self.fallbacks += 1
                return 'Json'  # Recursive edges own JSON, never pointers into a parent.
            if key in self.types:
                return self.types[key]
            self.active.add(key)
            name = prefix + 'Schema' + pas(ref.split('/')[-1])
            resolved = self.resolve(schema, doc)
            result = self.typ(resolved, doc, name, prefix, depth+1)
            self.active.remove(key)
            self.types[key] = result
            return result
        nullable = bool(schema.get('nullable'))
        schema = {k: v for k, v in schema.items() if k != 'nullable'}
        if isinstance(schema.get('type'), list):
            kinds = [t for t in schema['type'] if t != 'null']
            nullable |= 'null' in schema['type']
            if len(kinds) != 1:
                return 'Json'
            schema = {**schema, 'type': kinds[0]}
        for key in ('anyOf', 'oneOf'):
            if key in schema:
                nonnull = [s for s in schema[key] if self.resolve(s, doc).get('type') != 'null']
                if len(nonnull) == 1 and len(nonnull) < len(schema[key]):
                    actual = self.typ(nonnull[0], doc, hint, prefix, depth+1)
                    return f'wire::Nullable<{actual}>'
                def scalar_kind(part):
                    part=self.resolve(part,doc)
                    if part.get('type') in ('string','integer','number','boolean'):
                        return part['type']
                    values=part.get('enum',[part['const']] if 'const' in part else [])
                    if values and all(isinstance(value,str) for value in values):
                        return 'string'
                    return None
                kinds=[scalar_kind(part) for part in nonnull]
                if kinds and kinds[0] is not None and len(set(kinds))==1 and not schema.get('properties'):
                    out={'string':'std::string','integer':'std::int64_t','number':'double','boolean':'bool'}[kinds[0]]
                    return f'wire::Nullable<{out}>' if len(nonnull)<len(schema[key]) or nullable else out
        shape = self.object_shape(schema, doc)
        if shape is not None:
            if not shape.get('properties'):
                additional = shape.get('additionalProperties')
                actual = self.typ(additional, doc, hint+'Value', prefix, depth+1) if isinstance(additional, dict) else 'Json'
                out = f'std::map<std::string, {actual}>'
            else:
                out = self.struct(shape, doc, hint, prefix, depth+1)
        elif schema.get('type') == 'array':
            out = 'std::vector<' + self.typ(schema.get('items', {}), doc, hint+'Item', prefix, depth+1) + '>'
        elif schema.get('type') in ('string', 'number', 'integer', 'boolean'):
            out = {'string': 'std::string', 'number': 'double', 'integer': 'std::int64_t', 'boolean': 'bool'}[schema['type']]
        elif 'enum' in schema and schema['enum'] and all(isinstance(v, str) for v in schema['enum']):
            out = 'std::string'
        elif isinstance(schema.get('const'), str):
            out = 'std::string'
        else:
            self.fallbacks += 1
            out = 'Json'
        return f'wire::Nullable<{out}>' if nullable and out != 'Json' else out

    def struct(self, schema, doc, hint, prefix, depth):
        # Same schema in the same provider/doc shares one stable definition.
        signature = (prefix, self.scope(doc), json.dumps(schema, sort_keys=True))
        if signature in self.names:
            return self.names[signature]
        name = ident(hint)
        base = name
        suffix = 2
        used = {n for n in self.names.values()}
        while name in used:
            name = base + str(suffix)
            suffix += 1
        self.names[signature] = name
        props = schema.get('properties', {})
        fields, names = [], set()
        for key, value in props.items():
            field = ident(key)
            while field in names or field in ('json', 'from_json', 'extra_fields'):
                field += '_'
            names.add(field)
            typ = self.typ(value, doc, name+pas(key), prefix, depth+1)
            required = key in schema.get('required', [])
            comment = value.get('description', '') if isinstance(value, dict) else ''
            if isinstance(value, dict) and 'enum' in value:
                comment += ' Allowed wire values: ' + json.dumps(value['enum'], ensure_ascii=True)
            comment = re.sub(r'\s+', ' ', comment).replace('*/', '* /')[:240].rstrip()
            fields.append((key, field, typ if required else f'std::optional<{typ}>', comment))
        known = '{' + ', '.join(json.dumps(key) for key in props) + '}'
        lines = []
        if schema.get('x-cpp-union-projection'):
            lines.append('// Object union projection: shared required fields; variant fields optional. Raw JSON remains available.')
        lines.append(f'struct {name} {{')
        for key, field, typ, comment in fields:
            if comment:
                lines.append('    // ' + comment)
            lines.append(f'    {typ} {field}{{}};')
        lines += ['    std::map<std::string, Json> extra_fields;',
                  '    Json json() const {', '        std::vector<std::pair<std::string, Json>> fields;']
        for key, field, typ, comment in fields:
            lines.append(f'        wire::field(fields, {json.dumps(key)}, this->{field});')
        lines += [f'        wire::extras(fields, extra_fields, {known});',
                  '        return Json::object(fields);', '    }',
                  f'    static {name} from_json(const Json& object) {{',
                  f'        {name} out;', f'        out.extra_fields=wire::unknown(object, {known});']
        for key, field, typ, comment in fields:
            lines.append(f'        wire::read(object, {json.dumps(key)}, out.{field});')
        lines += ['        return out;', '    }', '};', '']
        self.definitions.append('\n'.join(lines))
        return name

    def source_operation(self, row, original):
        provider = row['provider']
        if provider in ('context', 'exa', 'brave', 'tinyfish', 'tavily'):
            key = original.get('key')
            if not key:
                if row['name'] == 'paidSearch':
                    doc = self.doc(self.root/'scripts/providers-a/fixtures/tavily-search.json')
                    return doc, doc['paths']['/search'], doc['paths']['/search']['post']
                return {}, {}, {}
            doc = self.doc(self.root/'scripts/providers-a/fixtures'/f'{key}.json')
            if key.startswith('brave-'):
                document = {'components': {'schemas': doc['schemas']}}
                op = {'parameters': doc['queryParams']+doc['headerParams']+doc['pathParams'], 'responses': {}}
                if doc.get('requestBody'):
                    op['requestBody'] = {'required': doc['requestBody']['required'], 'content': {'application/json': {'schema': doc['requestBody']['schema']}}}
                for response in doc['responses']:
                    if response.get('schema') is not None:
                        op['responses'][str(response['statusCode'])] = {'content': {'application/json': {'schema': response['schema']}}}
                return document, {}, op
            path, method = row['path'], row['method'].lower()
            paths = [path, '/websets'+path] + [p for p in doc['paths'] if p.endswith(path)]
            match = next((p for p in paths if p in doc['paths'] and method in doc['paths'][p]), None)
            if match is None:
                raise ValueError('Missing source operation: ' + str(row))
            return doc, doc['paths'][match], doc['paths'][match][method]
        files = {
            'parallel': ['parallel-openapi'], 'linkup': ['linkup-openapi'], 'firecrawl': ['firecrawl-openapi'],
            'wondersearch': ['wonder-openapi'], 'serper': ['serper-openapi', 'serper-scrape'],
            'you': ['you-'+n for n in ('web-search', 'contents', 'answer', 'research', 'finance-research', 'billing', 'images')],
            'perplexity': ['p-openapi']+['p-'+n+'.json' for n in ('gateway-chat', 'gateway-responses', 'gateway-messages', 'gateway-models', 'gateway-model', 'auth-generate', 'auth-revoke')],
        }.get(provider, [])
        matches = []
        for filename in files:
            doc = self.doc(self.root/'scripts/providers-b/snapshots'/filename)
            item = doc.get('paths', {}).get(row['path'], {})
            if row['method'].lower() in item:
                matches.append((doc, item, item[row['method'].lower()]))
        if len(matches) != 1:
            if provider == 'serpapi':
                return {}, {}, {}
            raise ValueError('Ambiguous native schema: ' + str(row))
        return matches[0]

    def operation(self, row, original):
        doc, item, operation = self.source_operation(row, original)
        stem = self.classes[row['provider']] + pas(row['name'])
        prefix = self.classes[row['provider']]
        parameters = [self.resolve(p, doc) for p in item.get('parameters', [])+operation.get('parameters', [])]
        parameters = [p for p in parameters if p['name'].lower() not in ('authorization', 'x-api-key', 'x-subscription-token')]
        if row['provider'] == 'context' and row['name'] in ('logoUrl', 'headLogo'):
            parameters = [{'name': k, 'in': 'query', 'required': k in ('domain', 'publicClientId'), 'schema': {'type': 'string'}} for k in ('domain', 'publicClientId', 'theme', 'type')]
        if row['provider'] == 'serpapi':
            if '{search_id}' in row['path']:
                parameters += [{'name': 'search_id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}]
            if row['name'] in ('search', 'searchHtml', 'searchMarkdown', 'searchPixelPositions'):
                parameters += [{'name': 'engine', 'in': 'query', 'required': True, 'schema': {'type': 'string'}}]
            if row['name'] in ('google', 'extract', 'extractMarkdown'):
                parameters += [{'name': 'q' if row['name']=='google' else 'url', 'in': 'query', 'required': True, 'schema': {'type': 'string'}}]
        fields = []
        aliases = []
        for where, suffix, field in [('path', 'Path', 'path'), ('query', 'Query', 'query'), ('header', 'Headers', 'headers')]:
            selected = [p for p in parameters if p['in'] == where]
            if not selected:
                if where == 'header':
                    fields.append(('headers', 'std::map<std::string, std::string>', False))
                continue
            schema = {'type': 'object', 'properties': {p['name']: p.get('schema', {}) for p in selected}, 'required': [p['name'] for p in selected if p.get('required')]}
            typ = self.typ(schema, doc, stem+suffix, prefix)
            aliases.append((stem+suffix, typ))
            fields.append((field, stem+suffix, bool(schema['required'])))
        rb = self.resolve(operation.get('requestBody', {}), doc)
        content = rb.get('content', {})
        body = content.get('application/json', {}).get('schema')
        raw = bool(content) and body is None or row['provider']=='serpapi' and row['name']=='uploadImage'
        if body is not None:
            typ = self.typ(body, doc, stem+'Body', prefix)
            aliases.append((stem+'Body', typ))
            fields.append(('body', stem+'Body', bool(original.get('bodyRequired', rb.get('required', False)))))
        if raw:
            fields.append(('raw_body', 'std::vector<std::uint8_t>', True))
        # All headers can be extended without introducing ambient credentials.
        lines = [f'struct {stem}Input {{']
        for field, typ, required in fields:
            lines.append('    '+(typ if required else f'std::optional<{typ}>')+' '+field+'{};')
        lines += ['    std::map<std::string, std::string> extra_headers;',
                  '    std::optional<std::string> access_mode;',
                  '    NativeInput native() const {',
                  '        NativeInput out;', '        std::vector<std::pair<std::string, Json>> fields;']
        for field, typ, required in fields:
            if field not in ('raw_body', 'headers'):
                lines.append(f'        wire::field(fields, "{field}", {field});')
            elif field == 'raw_body':
                lines.append('        out.raw_body=raw_body;')
        header_field = next(((t, r) for f, t, r in fields if f=='headers'), None)
        lines += ['        std::vector<std::pair<std::string, Json>> header_fields;']
        if header_field:
            typ, required = header_field
            if required:
                lines.append('        auto header_json=wire::encode(headers);')
            else:
                lines.append('        auto header_json=headers?wire::encode(*headers):Json::object({});')
            lines.append('        for (std::size_t i=0;i<header_json.size();++i) header_fields.emplace_back(header_json.key(i),header_json.at(i));')
        lines += ['        for (const auto& header:extra_headers) header_fields.emplace_back(header.first,Json::string(header.second));',
                  '        if (!header_fields.empty()) fields.emplace_back("headers",Json::object(header_fields));',
                  '        if (access_mode) fields.emplace_back("accessMode",Json::string(*access_mode));',
                  '        out.parameters=Json::object(fields); return out;', '    }', '};', '']
        response = 'Json'
        if row['response'] == 'json':
            schemas = []
            for status, spec in operation.get('responses', {}).items():
                if not str(status).startswith('2'):
                    continue
                value = self.resolve(spec, doc).get('content', {})
                for media in ('application/json', 'searchResults', 'sourcedAnswer', 'structured'):
                    if media in value and value[media].get('schema', {}) not in schemas:
                        schemas.append(value[media].get('schema', {}))
            schema = schemas[0] if len(schemas)==1 else {'oneOf': schemas} if schemas else {}
            response = self.typ(schema, doc, stem+'Response', prefix)
            aliases.append((stem+'Response', response))
            if response != 'Json':
                self.typed_operations += 1
        self.aliases.extend((name, typ) for name, typ in aliases if name != typ)
        return {'input': '\n'.join(lines), 'stem': stem, 'response': stem+'Response' if row['response']=='json' else None}

    def header(self, inputs):
        lines = ['// Generated from retained provider schemas by scripts/generate.py; see native-manifest.json.',
                 '#pragma once', '#include <searchsdk/wire.hpp>', 'namespace searchsdk::native {',
                 *self.definitions]
        seen = {}
        for name, typ in self.aliases:
            if name in seen and seen[name] != typ:
                raise ValueError('Conflicting native alias: '+name)
            if name not in seen:
                lines.append(f'using {name} = {typ};')
                seen[name] = typ
        lines += [entry['input'] for entry in inputs]
        lines += ['} // namespace searchsdk::native', '']
        return '\n'.join(lines)

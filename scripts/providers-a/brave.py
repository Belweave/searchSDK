"""Convert the official reference pages' structured API schemas to native clients.

The retained fixtures contain only public apiSpec records, never Svelte UI state.
The source Markdown tables are not used: they conflate optional/nullable fields.
"""
import copy
from generate import Gen, J

NAMES = {
    'ai-llm_context-get': 'llmContext',
    'ai-llm_context-post': 'llmContextPost',
    'ai-answers': 'answers',
    'web-search-get': 'search',
    'web-search-post': 'searchPost',
    'web-local_pois': 'localPois',
    'web-poi_descriptions': 'poiDescriptions',
    'web-rich_search': 'rich',
    'news-news_search-get': 'news',
    'news-news_search-post': 'newsPost',
    'videos-video_search-get': 'videos',
    'videos-video_search-post': 'videosPost',
    'images-image_search': 'images',
    'web-place_search': 'places',
    'other-suggestions': 'suggest',
    'other-spell_check': 'spellcheck',
}

specs = []
for suffix, name in NAMES.items():
    source = J('brave-' + suffix)
    operation = {
        'operationId': name,
        'summary': source['tagDisplayName'],
        'parameters': [],
        'responses': {},
    }
    for group in ['headerParams', 'queryParams', 'pathParams']:
        for parameter in source[group]:
            parameter = copy.deepcopy(parameter)
            if group == 'queryParams' and name == 'search' and parameter['name'] == 'result_filter':
                # The reference describes comma-delimited wire encoding even
                # though the semantic parameter schema is an array. Goggles
                # and other array parameters keep their own default encoding.
                parameter['style'] = 'form'
                parameter['explode'] = False
            if group == 'headerParams':
                # The shared HTTP transport takes already-serialized header
                # strings, including numeric geographic coordinates.
                parameter['schema'] = {
                    'type': 'string',
                    'description': parameter.get('description', ''),
                }
            operation['parameters'].append(parameter)
    if source.get('requestBody'):
        body = source['requestBody']
        operation['requestBody'] = {
            'required': body['required'],
            'content': {'application/json': {'schema': body['schema']}},
        }
    for response in source['responses']:
        value = {'description': response['description']}
        if response.get('schema') is not None:
            value['content'] = {'application/json': {'schema': response['schema']}}
        operation['responses'][response['statusCode']] = value
    if name == 'answers':
        # The endpoint reference describes the streaming delta shape. The
        # official Answers guide separately documents non-stream message.content.
        stream_schema = operation['responses']['200']['content']['application/json']['schema']
        operation['responses']['200']['content']['text/event-stream'] = {'schema': copy.deepcopy(stream_schema)}
        schemas = source['schemas']
        resolved = schemas[stream_schema['$ref'].split('/')[-1]]
        response_schema = copy.deepcopy(resolved)
        choices = response_schema['properties']['choices']
        choice = choices['items']
        if '$ref' in choice:
            choice = copy.deepcopy(schemas[choice['$ref'].split('/')[-1]])
            choices['items'] = choice
        choice['properties']['message'] = {
            'type': 'object',
            'properties': {'role': {'type': 'string'}, 'content': {'type': 'string'}},
            'required': ['content'],
        }
        choice['required'] = [key for key in choice.get('required', []) if key != 'delta'] + ['message']
        operation['responses']['200']['content']['application/json']['schema'] = response_schema
    document = {
        'openapi': '3.1.0',
        'servers': [{'url': source['serverUrl']}],
        'components': {'schemas': source['schemas']},
        'paths': {source['path']: {source['method'].lower(): operation}},
    }
    url = 'https://api-dashboard.search.brave.com/api-reference/' + suffix.replace('-', '/')
    specs.append(('brave-' + suffix, document, url))

Gen('brave', 'Brave', specs).emit()

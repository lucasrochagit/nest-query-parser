# nest-query-parser

A query string parser to be used in applications developed with NestJS.

# Prerequisites

As the name of the library suggests, this library was built to work together with the NestJS framework. However, as
future work, another library will be implemented that can be used as middleware of APIs that use Express or HapiJS.

# Installing

Use the follow command:

`npm i --save nest-query-parser`

# Usage

There are two ways to use the parsers available in this library: as a ParamDecorator or as a MethodDecorator.

If you want to use it as a ParamDecorator, just add the tag referring to the Parser to be used as a method parameter.
Example:

```ts
import { Get } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { ResourceService } from './resource.service';
import { MongoQuery, MongoQueryModel } from 'nest-query-parser';

@Controller('resources')
export class ResourceController {
    constructor(private readonly _service: ResourceService) {
    }

    @Get()
    public find(@MongoQuery() query: MongoQueryModel) {
        return this._service.find(query);
    }
}

```

It can also be used as a MethodDecorator. Just use the tag referring to the Parser to be used as the method decorator.
Example:

```ts
import { Injectable } from '@nestjs/common';
import { MongoQueryParser, MongoQueryModel } from 'nest-query-parser';

@Injectable()
export class ResourceService {
    @MongoQueryParser()
    public find(query: MongoQueryModel) {
        return [];
    }
}

```

# Examples

#### Request: http://localhost:3000/resources

#### Response:

```json
{
  "limit": 100,
  "skip": 0,
  "select": {},
  "sort": {},
  "filter": {}
}
```

#### Request: http://localhost:3000/resources?limit=10&page=2&select=_id,param_one,param_two&sort=-created_at&param_one=value

#### Response:

```json
{
  "limit": 10,
  "skip": 10,
  "select": {
    "_id": 1,
    "name": 1,
    "age": 1
  },
  "sort": {
    "created_at": -1
  },
  "filter": {
    "age": {
      "$gt": 30
    }
  }
}
```

## Explain the Resources

### Pagination

The paging feature is very useful for customers who will consume your API. It is through this feature that applications can define the data limit in a query, as well as define which page to be displayed. Each time a page of an application is selected, it means that some resources have been displaced (data offset or skip data).

There is a mathematical rule that relates page number to resource offset. Basically

`offset = (page - 1) * limit, where p > 0.`

This means that for a limit of 10 elements per page:

* To access page 1, the offset will be equal to = (1 - 1) * 10, so offset = 0
* To access page 2, the offset will be equal to = (2 - 1) * 10, so offset = 10
* To access page 3, the offset will be equal to = (3 - 1) * 10, so offset = 20

And so on.

## Observations

This library is generic. This means that it handles the query based on the query object itself. Therefore, it is not
possible to control events such as filter parameters with types incompatible with the types defined in the base. Use
proper queries for your API, to prevent implementation errors from being thrown into your app.

## Practical examples

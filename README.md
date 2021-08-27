<h1 align="center">Nest Query Parser</h1>
<p align="center">A query string parser to be used in applications developed with NestJS.</p>

[![License][license-image]][license-url]
[![NPM Version][npm-image]][npm-url]
[![Dependencies][dependencies-image]][dependencies-url]
[![Contributors][contributors-image]][contributors-url]
[![NPM Downloads][npm-downloads-image]][npm-downloads-url]


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

#### Query:

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

#### Query:

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

## Queries with @MongoQuery() | @MongoQueryParser()

### Pagination

The paging feature is very useful for customers who will consume your API. It is through this feature that applications
can define the data limit in a query, as well as define which page to be displayed. Each time a page of an application
is selected, it means that some resources have been displaced (data offset or skip data).

There is a mathematical rule that relates page number to resource offset. Basically:

`offset = (page - 1) * limit, where page > 0.`

This means that for a limit of 10 elements per page:

* To access page 1, the offset will be equal to = (1 - 1) * 10, so offset = 0
* To access page 2, the offset will be equal to = (2 - 1) * 10, so offset = 10
* To access page 3, the offset will be equal to = (3 - 1) * 10, so offset = 20

And so on.

With this library, it is possible to use pagination with the `page` parameter, or using the `sort` manually. By default,
the `limit` value is `100` and `skip` value is `0`.

Example:

#### Request: http://localhost:3000/resources?limit=10&page=3

#### Query:

```json
{
  "limit": 10,
  "skip": 20
}
```

#### Request: http://localhost:3000/resources?limit=10&skip=20

#### Query:

```json
{
  "limit": 10,
  "skip": 20
}
```

### Ordering

To work with ordering, you need to specify one or more sorting parameters, and whether you want the sorting to be
ascending or descending. For ascending ordering, just put the name of the ordering parameter. For descending ordering,
you need to put a "-" symbol before the name of the ordering parameter. Example:

#### Request: http://localhost:3000/resources?sort=created_at

#### Query:

```json
{
  "sort": {
    "created_at": 1
  }
}
```

#### Request: http://localhost:3000/resources?sort=-created_at

#### Query:

```json
{
  "sort": {
    "created_at": -1
  }
}
```

#### Request: http://localhost:3000/resources?sort=-age,name

#### Query:

```json
{
  "sort": {
    "age": -1,
    "name": 1
  }
}
```

In multiple-parameter ordering, the first ordering parameter has higher priority than the second, and so on. In the
example above, the ordering will be given primarily by the `age` parameter, in descending order. If there are two or
more objects with the same value in `age`, then those objects will be sorted by `name` in ascending order.

### Select

With this library, you can choose which parameters should be returned by the API. However, Mongo has a peculiarity: you
can also specify which parameters you don't want to be returned. The logic is similar to ordering: to specify which
parameters are to be returned, simply enter the parameter name; and to specify which parameters should not be returned,
just place a "-" symbol before the parameter.

Example:

#### Request: http://localhost:3000/resources?select=_id,name,age

#### Query:

```json
{
  "select": {
    "_id": 1,
    "name": 1,
    "age": 1
  }
}
```

#### Request: http://localhost:3000/resources?select=-_id,-created_at,-updated_at

#### Query:

```json
{
  "select": {
    "_id": 0,
    "created_at": 0,
    "updated_at": 0
  }
}
```

It is interesting to use one or the other in your queries, as one is complementary to the other. If you want almost all
parameters except a few, use the option to ignore parameters. If you want some parameters, and ignore the others, use
the option to select the ones you want.

### Filters

Now let's go to the most complex part of the library: the filters. There are several ways to apply filters in this
library, so I'm going to break this topic down into subtopics for every possible filter approach.

#### Simple Filters

Simple filters are equality filters. Basically it's set key=value. All filter parameters are defined as string, so there
are some validations that are done on these values.

1. If the value is a string number, it is transformed into a number, either integer or float/double (up to 16 decimal
   places).

2. If the value is in yyyy-MM-dd format or yyyy-MM-ddThh:mm:ss.sZ format, it is transformed into a Date object

3. Otherwise, the value is considered as a string.

Example:

#### Request: http://localhost:3000/resources?name=John%20Doe&age=31&birth_date=1990-01-01

#### Query:

```
{
  "filter": {
    "name": "John Doe",
    "age": 31,
    "birth_date": 1990-01-01T00:00:00.000Z
  }
}
```

#### Partial Filters

Partial filters are a way to search a string type value for a part of the value. There are three ways to use partial
filters. Making an analogy with javascript, it would be like using the `startsWith`, `endsWith` and `includes` methods,
where:

* startsWith: search for a string-type value that starts with a given substring. To do this, just add a "*" at the
  beginning of the substring.
* endsWith: search for a string-type value that ends with a given substring. To do this, just add a "*" at the end of
  the substring.
* includes: search for a string value that contains a specific substring. To do this, just add a "*" at the beginning
  and end of the substring.

Example:

#### Request: http://localhost:3000/resources?name=*Lu&email=gmail.com*&job=*Developer*

#### Query:

```JSON
{
  "filter": {
    "name": {
      "$regex": "^Lu",
      "$options": "i"
    },
    "email": {
      "$regex": "gmail.com$",
      "$options": "i"
    },
    "job": {
      "$regex": "Developer",
      "$options": "i"
    }
  }
}

```

#### Comparison Filters

Comparison operators are specific filtering options to check whether a parameter has a value. It is possible to check
not only equality, but other mathematical operators, such as: ">", ">=", "<", "<=", "!=". In addition, you can use
comparison operators to check whether an element is in an array.

According to the [mongodb documentation](https://docs.mongodb.com/manual/reference/operator/query-comparison/), the
available comparison operators are:

* $eq: Matches values that are equal to a specified value.
* $gt: Matches values that are greater than a specified value.
* $gte: Matches values that are greater than or equal to a specified value.
* $in: Matches any of the values specified in an array.
* $lt: Matches values that are less than a specified value.
* $lte: Matches values that are less than or equal to a specified value.
* $ne: Matches all values that are not equal to a specified value.
* $nin: Matches none of the values specified in an array.

To use these operators, just pass the comparator tag without the "$" symbol. Example:

#### Request: http://localhost:3000/resources?age=gt:30

#### Query:

```JSON
{
  "filter": {
    "age": {
      "$gt": 30
    }
  }
}

```

I won't put an example with all operators here, but you can test arithmetic comparison operators on parameters with
values of type string or number, or test the operators of `$in` and `$nin` on parameters of type array.

#### AND | OR filters

Finally, it is possible to use filters with AND | OR operator. The usage logic follows the arithmetic rule.

To use the AND operator, you must pass the same value twice in a query. Example:

#### Request: http://localhost:3000/resources?age=gt:30&age=50

#### Query:

```JSON
{
  "filter": {
    "$and": [
      {
        "age": {
          "$gt": 30
        }
      },
      {
        "age": 50
      }
    ]
  }
}

```

To use the OR operator, you must enter the values separated by a comma. Example:

#### Request: http://localhost:3000/resources?age=gt:30,50

#### Query:

```JSON
{
  "filter": {
    "$or": [
      {
        "age": {
          "$gt": 30
        }
      },
      {
        "age": 50
      }
    ]
  }
}

```

## Rules

* For pagination, you should use `limit`, `skip` and `page` only;
* For ordination, you should use `sort` only;
* For select, you should use `select` only;
* Anything other than `limit`, `skip`, `page`, `sort` and `select` will be considered a filter;
* Parameters never contain characters that don't fit the regex `/[^A-z0-9_]/g`;
* Filter values never contain characters that don't fit the regex `/[^\w\s@.-:]/g`;

## Observations

This library is generic. This means that it handles the query based on the query object itself. Therefore, it is not
possible to control events such as filter parameters with types incompatible with the types defined in the base. Use
proper queries for your API, to prevent implementation errors from being thrown into your app.

## Practical examples

Examples of real APIs that use the library to handle queries will be available as soon as possible, in
my [github repository](https://www.github.com/lucasrochagit).

## Upcoming features:

* Add a query handling option for Typeorm.


## License

Distributed under the Apache License 2.0. See `LICENSE` for more information.

<!-- CONTACT -->

## Authors

- **Lucas Rocha** - _Initial Work_. </br></br>
  [![LinkedIn](https://img.shields.io/static/v1?label=linkedin&message=@lucasrochacc&color=0A66C2)](https://www.linkedin.com/in/lucasrochacc/)
  [![Github](https://img.shields.io/static/v1?label=github&message=@lucasrochagit&color=black)](https://github.com/lucasrochagit/)

[//]: # (These are reference links used in the body of this note.)
[node.js]: <https://nodejs.org>
[npm.js]: <https://www.npmjs.com/>
[license-image]: https://img.shields.io/badge/license-Apache%202.0-blue.svg
[license-url]: https://github.com/lucasrochagit/nest-query-parser/blob/main/LICENSE
[npm-image]: https://img.shields.io/npm/v/nest-query-parser.svg?color=red&logo=npm
[npm-url]: https://npmjs.org/package/nest-query-parser
[npm-downloads-image]: https://img.shields.io/npm/dm/nest-query-parser.svg
[npm-downloads-url]: https://npmjs.org/package/nest-query-parser
[dependencies-image]: https://shields.io/badge/dependencies-1-green
[dependencies-url]: https://shields.io/badge/dependencies-0-green
[releases-image]: https://img.shields.io/github/release-date/lucasrochagit/nest-query-parser.svg
[releases-url]: https://github.com/lucasrochagit/nest-query-parser/releases
[contributors-image]: https://img.shields.io/github/contributors/lucasrochagit/nest-query-parser.svg?color=green
[contributors-url]: https://github.com/lucasrochagit/nest-query-parser/graphs/contributors
[issues-image]: https://img.shields.io/github/issues/lucasrochagit/nest-query-parser.svg

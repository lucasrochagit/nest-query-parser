import {
  createParamDecorator,
  ExecutionContext,
  UseFilters,
} from '@nestjs/common';
import {
  isISODate,
  isInt,
  isISODateTime,
  isNumberString,
} from '../utils/string.validator';
import { MongoQueryModel, QueryObjectModel } from '../model/query.model';
import { cleanString, splitString, testString } from '../utils/string.util';

export const MongoQueryParser = (): MethodDecorator => {
  return (_target, _key, descriptor: TypedPropertyDescriptor<any>) => {
    const original = descriptor.value;
    descriptor.value = async function (props: any) {
      const query: MongoQueryModel = _parse(props);
      const result = await original.apply(this, [query]);
      return result;
    };
    return descriptor;
  };
};

export const MongoQuery: () => ParameterDecorator = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): MongoQueryModel => {
    const query = ctx.getArgByIndex(0).query;
    return _parse(query);
  }
);

function _parse(query: any): MongoQueryModel {
  const def_limit = 100;
  const def_skip = 0;
  const def_page = 1;

  const result: MongoQueryModel = new MongoQueryModel();

  result.limit = _getIntKey(query, 'limit', def_limit);
  result.skip = query.page
    ? _getSkipFromPage(query, def_page, result.limit)
    : _getIntKey(query, 'skip', def_skip);
  result.select = _getSelect(query, {});
  result.sort = _getSort(query, {});
  result.filter = _getFilter(query, {});

  return result;
}

function _getIntKey(query: any, key: string, def: number): number {
  if (!query[key] || !isInt(query[key])) {
    return def;
  }
  return +query[key];
}

function _getSkipFromPage(query: any, def: number, limit: number): number {
  const page = _getIntKey(query, 'page', def);
  return page > 1 ? (page - 1) * limit : 0;
}

function _getSelect(query: any, def: QueryObjectModel): QueryObjectModel {
  if (!query.select) return def;
  return splitString(query.select, ',').reduce(
    (obj: { [x: string]: number }, key: string) => {
      const cleanKey: string = cleanString(key, /[^\w]/g);
      obj[cleanKey] = key.startsWith('-') ? 0 : 1;
      return obj;
    },
    {}
  );
}

function _getSort(query: any, def: QueryObjectModel): QueryObjectModel {
  if (!query.sort) return def;
  return splitString(query.sort, ',').reduce(
    (obj: { [x: string]: number }, key: string) => {
      const cleanKey: string = cleanString(key, /[^\w]/g);
      obj[cleanKey] = key.startsWith('-') ? -1 : 1;
      return obj;
    },
    {}
  );
}

function _getFilter(query: any, def: QueryObjectModel): QueryObjectModel {
  delete query.limit;
  delete query.skip;
  delete query.page;
  delete query.select;
  delete query.sort;
  if (!query) return def;
  return Object.keys(query).reduce((obj: any, key: string) => {
    const queryValue = query[key];
    if (queryValue instanceof Array) {
      const value = _getFilterArrayValue(key, queryValue);
      if (value.length) {
        obj.$and = [...(obj.$and || []), ...value];
      }
      return obj;
    } else if (isORFilter(queryValue)) {
      const value = _getFilterArrayValue(key, queryValue.split(','));
      if (value.length) {
        obj.$or = [...(obj.$or || []), ...value];
      }
      return obj;
    }

    const value = _getFilterValue(queryValue);
    if (value) obj[key] = value;
    return obj;
  }, {});
}

function _getFilterArrayValue(key: string, filter: string[]): any[] {
  const isAllComparisonFilters: boolean = filter.every((item) =>
    _isComparisonFilter(item)
  );
  if (!isAllComparisonFilters) return [];
  return filter.map((item) => ({ [key]: _getFilterValue(item) }));
}

function _getFilterValue(filter: string): string | number | any {
  if (!filter) return null;

  if (_isComparisonFilter(filter)) {
    const first_dot_index: number = filter.indexOf(':');
    const operator: string = filter.substring(0, first_dot_index);
    const value: string = filter.substring(first_dot_index + 1);
    if (!value) {
      return null;
    }
    return { [`$${operator}`]: _getFilterValue(value) };
  }

  if (isISODateTime(filter)) {
    return new Date(filter);
  }

  if (isNumberString(filter)) {
    return +filter;
  }

  const value = cleanString(filter, /[^\w\s@.-:]/g);
  let $regex = value;

  if (filter.indexOf('*') === -1) {
    return filter;
  }

  if (filter.startsWith('*')) {
    $regex = `^${value}`;
  } else if (filter.endsWith('*')) {
    $regex = `${value}$`;
  }
  return {
    $regex,
    $options: 'i',
  };
}

function _isComparisonFilter(filter: string) {
  return (
    filter.startsWith('eq:') ||
    filter.startsWith('gt:') ||
    filter.startsWith('gte:') ||
    filter.startsWith('in:') ||
    filter.startsWith('lt:') ||
    filter.startsWith('lte:') ||
    filter.startsWith('ne:') ||
    filter.startsWith('nin:')
  );
}

function isORFilter(filter: string): boolean {
  if (filter.indexOf(',') === -1) return false;
  return testString(filter, /^([\w\s@.-:],?)*(?<!,)$/);
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { MongoQueryModel, QueryObjectModel } from '../model/query.model';
import { cleanString, splitString, testString } from '../utils/string.util';
import {
  isInt,
  isISODateTime,
  isNumberString,
} from '../utils/string.validator';

export const MongoQueryParser = (): MethodDecorator => {
  return (_target, _key, descriptor: TypedPropertyDescriptor<any>) => {
    const original = descriptor.value;
    descriptor.value = async function (props: any) {
      const query: MongoQueryModel = parse(props);
      const result = await original.apply(this, [query]);
      return result;
    };
    return descriptor;
  };
};

export const MongoQuery: () => ParameterDecorator = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): MongoQueryModel => {
    const query = ctx.getArgByIndex(0).query;
    return parse(query);
  }
);

function parse(query: any): MongoQueryModel {
  const def_limit = 100;
  const def_skip = 0;
  const def_page = 1;

  const result: MongoQueryModel = new MongoQueryModel();

  result.limit = getIntKey(query, 'limit', def_limit);
  result.skip = query.page
    ? getSkipFromPage(query, def_page, result.limit)
    : getIntKey(query, 'skip', def_skip);
  result.select = getSelect(query, {});
  result.sort = getSort(query, {});
  result.filter = getFilter(query, {});

  return result;
}

function getIntKey(query: any, key: string, def: number): number {
  if (!query[key] || !isInt(query[key])) {
    return def;
  }
  return +query[key];
}

function getSkipFromPage(query: any, def: number, limit: number): number {
  const page = getIntKey(query, 'page', def);
  return page > 1 ? (page - 1) * limit : 0;
}

function getSelect(query: any, def: QueryObjectModel): QueryObjectModel {
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

function getSort(query: any, def: QueryObjectModel): QueryObjectModel {
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

function getFilter(query: any, def: QueryObjectModel): QueryObjectModel {
  delete query.limit;
  delete query.skip;
  delete query.page;
  delete query.select;
  delete query.sort;
  if (!query) return def;
  return Object.keys(query).reduce((obj: any, key: string) => {
    const queryValue = query[key];
    if (queryValue instanceof Array) {
      const allSimpleFilters: string[] = queryValue.filter((item: string) =>
        isSimpleFilter(item)
      );

      const filterSimpleValues = getArrayValue(key, allSimpleFilters);
      if (filterSimpleValues.length) {
        obj.$and = [...(obj.$and || []), ...filterSimpleValues];
      }

      const allORFilters: string[] = queryValue
        .filter((item: string) => isORFilter(item))
        .map((item) => item.split(','))
        .reduce((arr, item) => {
          arr = [...arr, ...item];
          return arr;
        }, []);

      const filterORValues = getArrayValue(key, [...allORFilters]);

      if (filterORValues.length) {
        obj.$or = [...(obj.$or || []), ...filterORValues];
      }
      return obj;
    } else if (isORFilter(queryValue)) {
      const value = getArrayValue(key, queryValue.split(','));
      if (value.length) {
        obj.$or = [...(obj.$or || []), ...value];
      }
      return obj;
    }

    const value = getSimpleFilterValue(queryValue);
    if (value) obj[key] = value;
    return obj;
  }, {});
}

function getArrayValue(key: string, filter: string[]): object[] {
  if (!filter || !filter.length) return [];
  return filter.map((item) => ({ [key]: getSimpleFilterValue(item) }));
}

function getSimpleFilterValue(
  filter: string
): string | number | Date | object | null {
  if (!filter) return null;

  if (isComparisonFilter(filter)) {
    const first_dot_index: number = filter.indexOf(':');
    const operator: string = filter.substring(0, first_dot_index);
    const value: string = filter.substring(first_dot_index + 1);
    if (!value) {
      return null;
    }
    return { [`$${operator}`]: getSimpleFilterValue(value) };
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

function isComparisonFilter(filter: string): boolean {
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

function isSimpleFilter(value: string): boolean {
  return testString(value, /^([\w\s@.\-:])*(?<! )$/);
}

function isORFilter(filter: string): boolean {
  if (filter.indexOf(',') === -1) return false;
  return testString(filter, /^([\w\s@.\-:],?)*(?<!,)$/);
}

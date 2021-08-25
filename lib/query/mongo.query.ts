import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { isInt, isNumberString } from '../utils/string.validator';
import { MongoQueryModel, QueryObjectModel } from '../model/query.model';

export const MongoQuery: () => ParameterDecorator = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): MongoQueryModel => {
    const def_limit = 100;
    const def_skip = 0;
    const def_page = 1;

    const query = ctx.getArgByIndex(0).query;

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
);

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
  return _splitParamValue(query.select, ',').reduce(
    (obj: { [x: string]: number }, key: string) => {
      if (key.startsWith('-')) {
        obj[_cleanParamKey(key)] = 0;
      } else {
        obj[_cleanParamValue(key)] = 1;
      }
      return obj;
    },
    {}
  );
}

function _getSort(query: any, def: QueryObjectModel): QueryObjectModel {
  if (!query.sort) return def;
  return _splitParamValue(query.sort, ',').reduce(
    (obj: { [x: string]: number }, key: string) => {
      if (key.startsWith('-')) {
        obj[_cleanParamKey(key)] = -1;
      } else {
        obj[_cleanParamValue(key)] = 1;
      }
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
    const value = _getFilterValue(query[key]);
    if (value) obj[key] = value;
    return obj;
  }, {});
}

function _getFilterValue(filter: string): string | number | any {
  if (!filter) return null;
  if (isNumberString(filter)) {
    return +filter;
  }
  const value = _cleanParamValue(filter);
  let $regex = value;
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

function _splitParamValue(param: string, sep: string): string[] {
  return param.split(sep).filter((param: string) => !!param);
}

function _cleanParamKey(key: string): string {
  return key.replace(/[^\w]/g, '');
}

function _cleanParamValue(value: string): string {
  return value.replace(/[^\w\s@.-]/g, '').trim();
}

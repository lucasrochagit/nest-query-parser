export class MongoQueryModel {
    limit!: number
    skip!: number;
    sort!: QueryObjectModel;
    select!: QueryObjectModel;
    filter!: QueryObjectModel;
  }
  
  export class QueryObjectModel {
    [key: string]: string | number;
  }
  
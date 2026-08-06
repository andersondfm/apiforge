/**
 * Map SQL / database column types to TypeScript and C# types.
 */

export function mapSqlToTs(dataType: string): string {
  const t = dataType.toLowerCase().trim();

  if (/^(boolean|bool|bit)$/.test(t) || t.includes('bool')) return 'boolean';
  if (
    /^(tinyint|smallint|mediumint|int|integer|bigint|serial|bigserial|smallserial|int2|int4|int8|number)$/.test(t) ||
    (/int/.test(t) && !/interval|point|point/.test(t))
  ) {
    return 'number';
  }
  if (/^(decimal|numeric|money|smallmoney|real|float|double|double precision|float4|float8)$/.test(t)) {
    return 'number';
  }
  if (/^(date|time|timetz|timestamp|timestamptz|datetime|datetime2|datetimeoffset|smalldatetime)$/.test(t) ||
      /timestamp|datetime/.test(t)) {
    return 'Date';
  }
  if (/^(uuid|uniqueidentifier|guid)$/.test(t)) return 'string';
  if (/json|jsonb/.test(t)) return 'unknown';
  if (/bytea|blob|binary|varbinary|image|raw/.test(t)) return 'Buffer';
  if (/char|text|clob|xml|varchar|nvarchar|nchar|ntext|string|citext/.test(t)) return 'string';

  return 'unknown';
}

export function mapSqlToCSharp(dataType: string, nullable = false): string {
  const t = dataType.toLowerCase().trim();
  let cs = 'string';

  if (/^(uniqueidentifier|uuid|guid)$/.test(t)) cs = 'Guid';
  else if (/^bigint|int8|bigserial$/.test(t) || t === 'bigint') cs = 'long';
  else if (/^(smallint|tinyint|int2|smallserial)$/.test(t)) cs = 'short';
  else if (/^(int|integer|int4|serial|mediumint)$/.test(t) || (/^int/.test(t) && !/interval/.test(t))) cs = 'int';
  else if (/^(boolean|bool|bit)$/.test(t) || t.includes('bool')) cs = 'bool';
  else if (/^(decimal|numeric|money|smallmoney)$/.test(t)) cs = 'decimal';
  else if (/^(real|float4|float)$/.test(t) && !/double/.test(t)) cs = 'float';
  else if (/^(double|double precision|float8)$/.test(t)) cs = 'double';
  else if (/datetimeoffset/.test(t)) cs = 'DateTimeOffset';
  else if (/^(date|time|timetz|timestamp|timestamptz|datetime|datetime2|smalldatetime)$/.test(t) ||
           /timestamp|datetime/.test(t)) cs = 'DateTime';
  else if (/bytea|blob|binary|varbinary|image|raw/.test(t)) cs = 'byte[]';
  else if (/json|jsonb/.test(t)) cs = 'string';
  else cs = 'string';

  if (!nullable) return cs;
  if (cs === 'string' || cs === 'byte[]') return `${cs}?`;
  return `${cs}?`;
}

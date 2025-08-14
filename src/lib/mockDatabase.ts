// Mock database service that mimics Supabase database API

import { mockStorage } from './mockStorage';

type TableName = 'users' | 'leagues' | 'teams' | 'players';

interface QueryResponse<T> {
  data: T[] | T | null;
  error: Error | null;
}

class MockQueryBuilder<T = any> {
  private tableName: TableName;
  private selectFields: string[] = ['*'];
  private whereConditions: Array<{ field: string; operator: string; value: any }> = [];
  private limitValue?: number;
  private orderByField?: string;
  private orderDirection: 'asc' | 'desc' = 'asc';

  constructor(tableName: TableName) {
    this.tableName = tableName;
  }

  // SELECT operation
  select(fields?: string): MockQueryBuilder<T> {
    if (fields) {
      this.selectFields = fields.split(',').map(f => f.trim());
    }
    return this;
  }

  // WHERE conditions
  eq(field: string, value: any): MockQueryBuilder<T> {
    this.whereConditions.push({ field, operator: 'eq', value });
    return this;
  }

  neq(field: string, value: any): MockQueryBuilder<T> {
    this.whereConditions.push({ field, operator: 'neq', value });
    return this;
  }

  gt(field: string, value: any): MockQueryBuilder<T> {
    this.whereConditions.push({ field, operator: 'gt', value });
    return this;
  }

  gte(field: string, value: any): MockQueryBuilder<T> {
    this.whereConditions.push({ field, operator: 'gte', value });
    return this;
  }

  lt(field: string, value: any): MockQueryBuilder<T> {
    this.whereConditions.push({ field, operator: 'lt', value });
    return this;
  }

  lte(field: string, value: any): MockQueryBuilder<T> {
    this.whereConditions.push({ field, operator: 'lte', value });
    return this;
  }

  like(field: string, value: string): MockQueryBuilder<T> {
    this.whereConditions.push({ field, operator: 'like', value });
    return this;
  }

  in(field: string, values: any[]): MockQueryBuilder<T> {
    this.whereConditions.push({ field, operator: 'in', value: values });
    return this;
  }

  // LIMIT
  limit(count: number): MockQueryBuilder<T> {
    this.limitValue = count;
    return this;
  }

  // ORDER BY
  order(field: string, options?: { ascending?: boolean }): MockQueryBuilder<T> {
    this.orderByField = field;
    this.orderDirection = options?.ascending === false ? 'desc' : 'asc';
    return this;
  }

  // Execute query and return results
  async execute(): Promise<QueryResponse<T>> {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));

      let data = mockStorage.getTable(this.tableName);

      // Apply WHERE conditions
      data = this.applyWhereConditions(data);

      // Apply ORDER BY
      if (this.orderByField) {
        data = this.applyOrderBy(data);
      }

      // Apply LIMIT
      if (this.limitValue) {
        data = data.slice(0, this.limitValue);
      }

      // Apply SELECT fields
      if (this.selectFields[0] !== '*') {
        data = this.applySelectFields(data);
      }

      return { data: data as T[], error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // INSERT operation
  async insert(values: Partial<T> | Partial<T>[]): Promise<QueryResponse<T>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 150));

      const data = mockStorage.getTable(this.tableName);
      const insertValues = Array.isArray(values) ? values : [values];
      const insertedRecords: T[] = [];

      for (const value of insertValues) {
        const newRecord = {
          id: mockStorage.generateId(),
          ...value,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as T;

        data.push(newRecord);
        insertedRecords.push(newRecord);
      }

      mockStorage.saveTable(this.tableName, data);
      
      return { 
        data: insertedRecords.length === 1 ? insertedRecords[0] : insertedRecords, 
        error: null 
      };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // UPDATE operation
  async update(values: Partial<T>): Promise<QueryResponse<T>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 150));

      let data = mockStorage.getTable(this.tableName);
      const updatedRecords: T[] = [];

      data = data.map(record => {
        if (this.matchesConditions(record)) {
          const updatedRecord = {
            ...record,
            ...values,
            updated_at: new Date().toISOString(),
          } as T;
          updatedRecords.push(updatedRecord);
          return updatedRecord;
        }
        return record;
      });

      mockStorage.saveTable(this.tableName, data);

      return { data: updatedRecords, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // DELETE operation
  async delete(): Promise<QueryResponse<T>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 150));

      let data = mockStorage.getTable(this.tableName);
      const deletedRecords: T[] = [];

      data = data.filter(record => {
        if (this.matchesConditions(record)) {
          deletedRecords.push(record as T);
          return false; // Remove from array
        }
        return true; // Keep in array
      });

      mockStorage.saveTable(this.tableName, data);

      return { data: deletedRecords, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // Helper methods
  private applyWhereConditions(data: any[]): any[] {
    return data.filter(record => this.matchesConditions(record));
  }

  private matchesConditions(record: any): boolean {
    return this.whereConditions.every(condition => {
      const fieldValue = record[condition.field];
      
      switch (condition.operator) {
        case 'eq':
          return fieldValue === condition.value;
        case 'neq':
          return fieldValue !== condition.value;
        case 'gt':
          return fieldValue > condition.value;
        case 'gte':
          return fieldValue >= condition.value;
        case 'lt':
          return fieldValue < condition.value;
        case 'lte':
          return fieldValue <= condition.value;
        case 'like':
          return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
        case 'in':
          return condition.value.includes(fieldValue);
        default:
          return true;
      }
    });
  }

  private applyOrderBy(data: any[]): any[] {
    return [...data].sort((a, b) => {
      const aValue = a[this.orderByField!];
      const bValue = b[this.orderByField!];
      
      if (aValue < bValue) return this.orderDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.orderDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private applySelectFields(data: any[]): any[] {
    return data.map(record => {
      const selectedRecord: any = {};
      this.selectFields.forEach(field => {
        if (record.hasOwnProperty(field)) {
          selectedRecord[field] = record[field];
        }
      });
      return selectedRecord;
    });
  }
}

class MockDatabase {
  // Main entry point - mimics supabase.from()
  from<T = any>(tableName: TableName): MockQueryBuilder<T> {
    return new MockQueryBuilder<T>(tableName);
  }
}

export const mockDatabase = new MockDatabase();
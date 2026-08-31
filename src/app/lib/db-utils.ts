/**
 * Utilitários para compatibilidade entre SQLite e PostgreSQL
 */

import { prisma } from './prisma';

/**
 * Detecta qual banco de dados está sendo usado
 */
export function getDatabaseProvider(): 'sqlite' | 'postgresql' {
  const url = process.env.DATABASE_URL || '';
  if (url.includes('postgresql://') || url.includes('postgres://') || url.includes('postgresql')) {
    return 'postgresql';
  }
  return 'sqlite';
}

/**
 * Adapta uma query SQL para o banco de dados atual
 * Converte placeholders ? para $1, $2, etc. no PostgreSQL
 */
export function adaptQueryForDatabase(query: string, params: any[]): { query: string; params: any[] } {
  const provider = getDatabaseProvider();
  
  if (provider === 'postgresql') {
    // Converter ? para $1, $2, $3, etc.
    let paramIndex = 1;
    const adaptedQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
    
    // Ajustar funções SQL específicas
    let adapted = adaptedQuery
      .replace(/datetime\(([^)]+)\)/gi, '$1::timestamp')
      .replace(/COUNT\(\*\)/gi, 'COUNT(*)')
      .replace(/FROM\s+(\w+)/gi, 'FROM "$1"')
      .replace(/WHERE\s+(\w+)/gi, 'WHERE "$1"')
      .replace(/SET\s+(\w+)/gi, 'SET "$1"')
      .replace(/ADD COLUMN\s+(\w+)/gi, 'ADD COLUMN "$1"');
    
    return { query: adapted, params };
  }
  
  // SQLite - manter como está
  return { query, params };
}

/**
 * Executa uma query raw adaptada para o banco de dados
 */
export async function executeAdaptedQuery<T = any>(
  query: string,
  ...params: any[]
): Promise<T> {
  const { query: adaptedQuery, params: adaptedParams } = adaptQueryForDatabase(query, params);
  
  return prisma.$queryRawUnsafe<T>(adaptedQuery, ...adaptedParams);
}

/**
 * Executa um comando raw adaptado para o banco de dados
 */
export async function executeAdaptedCommand(
  query: string,
  ...params: any[]
): Promise<any> {
  const { query: adaptedQuery, params: adaptedParams } = adaptQueryForDatabase(query, params);
  
  return prisma.$executeRawUnsafe(adaptedQuery, ...adaptedParams);
}

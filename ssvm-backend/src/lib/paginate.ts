export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
  orderBy: Record<string, 'asc' | 'desc'>;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export function parsePaginationParams(
  query: any,
  allowedSortFields: string[] = ['createdAt']
): PaginationParams {
  let page = parseInt(query.page as string, 10);
  if (isNaN(page) || page < 1) page = 1;

  let limit = parseInt(query.limit as string, 10);
  if (isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  const skip = (page - 1) * limit;
  const take = limit;

  let sortBy = query.sortBy as string;
  let sortOrder = (query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc';

  if (!sortBy || !allowedSortFields.includes(sortBy)) {
    sortBy = allowedSortFields[0] || 'createdAt';
  }

  const orderBy = { [sortBy]: sortOrder as 'asc' | 'desc' };

  return { page, limit, skip, take, orderBy };
}

export function buildPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

export async function paginatedQuery<T>(
  prismaModel: any,
  where: any,
  include: any | undefined,
  params: PaginationParams
): Promise<PaginatedResponse<T>> {
  const [data, total] = await Promise.all([
    prismaModel.findMany({
      where,
      include,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
    }),
    prismaModel.count({ where }),
  ]);

  return buildPaginationResponse<T>(data, total, params.page, params.limit);
}

export async function paginateCursor<T>(
  prismaModel: any,
  where: any,
  cursor: any,
  take: number = 50,
  include?: any,
  orderBy: any = { id: 'desc' }
): Promise<{ success: true; data: T[]; nextCursor: any | null }> {
  const data = await prismaModel.findMany({
    where,
    include,
    take: take + 1, // Fetch one extra to determine if there's a next page
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy,
  });

  let nextCursor: any | null = null;
  if (data.length > take) {
    const nextItem = data.pop();
    nextCursor = nextItem.id;
  }

  return {
    success: true,
    data,
    nextCursor,
  };
}

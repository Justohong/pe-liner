import { NextResponse } from 'next/server';
import { calculateConstructionCost, CalculationOptions } from '@/lib/calculationEngine';

export async function POST(req: Request) {
  try {
    // 요청 본문에서 계산에 필요한 옵션 추출
    const body = await req.json();
    const options: CalculationOptions = {
      pipeType: body.pipeType,
      diameter: Number(body.diameter),
      length: Number(body.length),
      isRiser: Boolean(body.isRiser),
    };

    // 입력값 검증
    if (!['steel', 'ductile'].includes(options.pipeType)) {
      return NextResponse.json(
        { error: '관종은 steel 또는 ductile이어야 합니다.' },
        { status: 400 }
      );
    }

    if (isNaN(options.diameter) || options.diameter <= 0) {
      return NextResponse.json(
        { error: '관경은 양수여야 합니다.' },
        { status: 400 }
      );
    }

    if (isNaN(options.length) || options.length <= 0) {
      return NextResponse.json(
        { error: '길이는 양수여야 합니다.' },
        { status: 400 }
      );
    }

    // 계산 실행
    const result = await calculateConstructionCost(options);

    // 결과 반환
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('계산 중 오류 발생:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '계산 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 
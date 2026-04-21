import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RfqService } from './rfq.service';
import { CreateRfqDto } from '../dto/create-rfq.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('rfq')
export class RfqController {
    constructor(private readonly rfqService: RfqService) { }

    // Crear solicitud de cotización (Protegido)
    @UseGuards(JwtAuthGuard)
    @Post()
    async createRfq(
        @Body() body: CreateRfqDto,
        @GetUser() user: any
    ) {
        return this.rfqService.createRfqV2(user, body);
    }

    // Listar RFQs públicos (Público)
    @Get()
    async listPublicRfqs(
        @Query('sector') sector?: string,
        @Query('page') page: number = 1
    ) {
        return this.rfqService.listPublicRfqs(sector, page);
    }

    // Mis RFQs (Protegido)
    @UseGuards(JwtAuthGuard)
    @Get('my-requests')
    async getMyRfqs(@GetUser() user: any) {
        return this.rfqService.getMyRfqsV2(user);
    }

    // RFQs recibidos (Protegido)
    @UseGuards(JwtAuthGuard)
    @Get('received')
    async getReceivedRfqs(@GetUser() user: any) {
        return this.rfqService.getReceivedRfqsV2(user);
    }

    // Detalle de RFQ (Público/Protegido dependiendo de is_public, lógica en service)
    @Get(':id')
    async getRfqDetail(@Param('id') id: string) {
        return this.rfqService.getRfqDetail(id);
    }

    // Responder a RFQ (Protegido)
    @UseGuards(JwtAuthGuard)
    @Post(':id/quote')
    async submitQuote(
        @Param('id') rfqId: string,
        @Body() body: {
            price: number;
            deliveryDays: number;
            notes?: string;
        },
        @GetUser() user: any
    ) {
        return this.rfqService.submitQuoteV2(rfqId, user, body);
    }

    // Aceptar cotización (Protegido)
    @UseGuards(JwtAuthGuard)
    @Post(':id/quote/:quoteId/accept')
    async acceptQuote(
        @Param('id') rfqId: string,
        @Param('quoteId') quoteId: string,
        @GetUser() user: any
    ) {
        return this.rfqService.acceptQuoteV2(rfqId, quoteId, user);
    }
}

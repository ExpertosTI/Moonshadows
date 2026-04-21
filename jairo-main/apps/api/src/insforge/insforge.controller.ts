import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { InsforgeService } from './insforge.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Puede estar protegido por un API Key especial en el futuro

@Controller('insforge')
export class InsforgeController {
    constructor(private readonly insforgeService: InsforgeService) {}

    // GET /api/insforge/export
    @Get('export')
    async exportDataForAI() {
        return this.insforgeService.getDepuratedDataForAI();
    }

    // POST /api/insforge/metadata/:companyId
    @Post('metadata/:companyId')
    async updateMetadata(
        @Param('companyId') companyId: string,
        @Body() body: any
    ) {
        return this.insforgeService.updateAiMetadata(companyId, body);
    }
}

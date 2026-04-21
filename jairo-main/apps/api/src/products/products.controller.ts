import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    // Listar productos (Público)
    @Get()
    async listProducts(
        @Query('companyId') companyId?: string,
        @Query('sector') sector?: string,
        @Query('busqueda') busqueda?: string,
        @Query('minPrice') minPrice?: number,
        @Query('maxPrice') maxPrice?: number,
        @Query('page') page: number = 1
    ) {
        return this.productsService.listProducts({ companyId, sector, busqueda, minPrice, maxPrice }, page);
    }

    // Detalle de producto (Público)
    @Get(':id')
    async getProduct(@Param('id') id: string) {
        return this.productsService.getProduct(id);
    }

    // Productos de mi empresa (Protegido)
    @UseGuards(JwtAuthGuard)
    @Get('my/catalog')
    async getMyCatalog(@GetUser() user: any) {
        return this.productsService.getMyCatalogV2(user);
    }

    // Crear producto (Protegido)
    @UseGuards(JwtAuthGuard)
    @Post()
    async createProduct(
        @Body() body: CreateProductDto,
        @GetUser() user: any
    ) {
        return this.productsService.createProductV2(user, body);
    }

    // Actualizar producto (Protegido)
    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    async updateProduct(
        @Param('id') id: string,
        @Body() body: any,
        @GetUser() user: any
    ) {
        return this.productsService.updateProductV2(id, user, body);
    }

    // Eliminar producto (Protegido)
    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async deleteProduct(
        @Param('id') id: string,
        @GetUser() user: any
    ) {
        return this.productsService.deleteProductV2(id, user);
    }

    // Importar productos (Protegido)
    @UseGuards(JwtAuthGuard)
    @Post('import')
    async importProducts(
        @Body() body: { products: any[] },
        @GetUser() user: any
    ) {
        return this.productsService.importProductsV2(user, body.products);
    }
}

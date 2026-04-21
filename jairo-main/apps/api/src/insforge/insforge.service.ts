import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { companies, products, sectors } from '@repo/database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class InsforgeService {
    private readonly logger = new Logger(InsforgeService.name);

    constructor(private readonly db: DatabaseService) {}

    /**
     * Extrae y depura los datos de las empresas y productos 
     * para que Insforge (Motor de IA) pueda indexarlos fácilmente.
     */
    async getDepuratedDataForAI() {
        this.logger.log('Extrayendo datos depurados para Insforge AI...');

        const allCompanies = await this.db.drizzle.query.companies.findMany({
            where: eq(companies.status, 'active'),
            with: {
                sector: true,
            }
        });

        const allProducts = await this.db.drizzle.query.products.findMany({
            where: eq(products.isActive, 'true'),
        });

        // Formato específico optimizado para generación de Embeddings / LLM Context
        const formattedData = allCompanies.map(company => {
            const companyProducts = allProducts.filter(p => p.companyId === company.id);
            
            // Limpieza básica de HTML y caracteres extraños (Depuración)
            const cleanDescription = (text?: string | null) => {
                if (!text) return '';
                return text.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
            };

            return {
                insforge_id: `COMP_${company.id}`,
                entity_type: 'company',
                name: company.name,
                sector: company.sector?.name || 'General',
                location: cleanDescription(company.address),
                semantic_context: `Empresa ${company.name} operando en el sector de ${company.sector?.name || 'General'}. Ubicada en ${cleanDescription(company.address)}.`,
                products_catalog: companyProducts.map(p => ({
                    id: p.id,
                    name: p.name,
                    description: cleanDescription(p.description),
                    price: p.price,
                    tags: [company.sector?.name, p.name.split(' ')[0]].filter(Boolean) // Simple tag generation
                })),
                raw_metadata: company.aiMetadata || {}
            };
        });

        return {
            status: 'success',
            count: formattedData.length,
            timestamp: new Date().toISOString(),
            data: formattedData
        };
    }

    /**
     * Endpoint para recibir actualizaciones de la IA 
     * (e.g. cuando Insforge calcula nuevos embeddings o scores)
     */
    async updateAiMetadata(companyId: string, metadata: any) {
        await this.db.drizzle.update(companies)
            .set({ aiMetadata: metadata })
            .where(eq(companies.id, companyId));
            
        this.logger.log(`Metadata de IA actualizada para la empresa ${companyId}`);
        return { success: true };
    }
}

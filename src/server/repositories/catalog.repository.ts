import "server-only";
import { db } from "@/server/db";

export interface CatalogMatch {
  brand: string;
  generic: string;
  form: string;
  company: string;
  /** All registered strengths of this brand + generic + form, smallest first. */
  strengths: string[];
}

const firstNumber = (s: string) => Number.parseFloat(s) || 0;

export const catalogRepository = {
  /**
   * Search-as-you-type over the DGDA catalogue: brand prefix first, then generic name matches.
   * Rows for the same brand/generic/form are folded into one match with all its strengths.
   */
  async search(query: string, limit = 8): Promise<CatalogMatch[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    const key = q.toLowerCase();
    const rows = await db.medicineCatalog.findMany({
      where: { OR: [{ brandKey: { startsWith: key } }, { generic: { contains: q } }] },
      select: { brand: true, generic: true, strength: true, form: true, company: true },
      orderBy: { brandKey: "asc" },
      take: 400,
    });
    const groups = new Map<string, CatalogMatch & { brandHit: boolean }>();
    for (const r of rows) {
      const id = `${r.brand.toLowerCase()}|${r.generic.toLowerCase()}|${r.form.toLowerCase()}`;
      const g = groups.get(id) ?? { brand: r.brand, generic: r.generic, form: r.form, company: r.company, strengths: [], brandHit: r.brand.toLowerCase().startsWith(key) };
      if (r.strength && !g.strengths.includes(r.strength)) g.strengths.push(r.strength);
      groups.set(id, g);
    }
    return [...groups.values()]
      .sort((a, b) => Number(b.brandHit) - Number(a.brandHit) || a.brand.localeCompare(b.brand) || a.form.localeCompare(b.form))
      .slice(0, limit)
      .map((m) => ({ brand: m.brand, generic: m.generic, form: m.form, company: m.company, strengths: m.strengths.sort((x, y) => firstNumber(x) - firstNumber(y)) }));
  },
};

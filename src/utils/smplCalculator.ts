/**
 * SMPL Shape Key Calculator — Orthogonal Linear Basis System
 *
 * Sign conventions confirmed by visual morph-target debug inspection:
 *
 *  shape000 → SQUASH/STRETCH (Height)       (INVERTED: − = tall & thin, + = short & thick)
 *  shape001 → FAT vs LEAN                   (INVERTED: − = fatter, + = thinner)
 *  shape002 → TORSO LENGTH                  (normal:   + = longer torso)
 *  shape003 → MUSCULAR + V-TAPER            (normal:   + = muscular broadness)
 *  shape004 → PUFFY BELLY / REVERSE         (normal:   + = puffed/compressed)
 *  shape005 → WAIST / HIP PUFFINESS         (normal:   + = thicker waist/hips)
 *  shape006 → MUSCULARITY DEFINITION        (INVERTED: − = defined muscle, + = soft/puff)
 *  shape007 → CHEST VERTICAL POSITION       (INVERTED: − = chest lifted up, + = sag)
 *  shape008 → MINIMAL                       (normal:   mild puffiness)
 *  shape009 → CHEST GAP width               (normal:   + = wider gap)
 *
 * ─── Key design principle ────────────────────────────────────────────────────
 *  SMPL shape000 (b[0]) does NOT just change height; it's proportional scaling. 
 *  A negative b[0] makes the avatar TALL AND THIN. 
 *  A positive b[0] makes the avatar SHORT AND THICK.
 *  
 *  If we use non-linear BMI, we "double dip". A taller person gets thinned out
 *  by b[0], resulting in a low BMI, which triggers extreme thinness from b[1].
 * 
 *  Instead, we use Strict Linear Combinations:
 *  - Height is controlled purely by b[0].
 *  - Volume (Weight) is injected inversely to compensate for b[0]'s squashing.
 *  - We use Waist vs Chest deltas to route the Weight mathematically into
 *    either Fat (b[1], b[4], b[5]) or Muscle (b[3]).
 */

// ─── Population averages ──────────────────────────────────────────────────────
const MALE_AVG = { height: 176, weight: 75, chest: 100, waist: 85, hip: 98, age: 30 };
const FEMALE_AVG = { height: 162, weight: 63, chest: 90, waist: 75, hip: 100, age: 30 };

export type BasicMeasurements = {
    height: number;
    weight: number;
    chest: number;
    waist: number;
    hip: number;
    age: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** (value − avg) / stdDev — unclamped, sign-correct linear delta */
function d(val: number, avg: number, std: number): number {
    return (val - avg) / std;
}

function clamp(v: number, lo = -5, hi = 5): number {
    return Math.max(lo, Math.min(hi, v));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function calculateSMPLBlendshapes(
    m: BasicMeasurements,
    gender: 'male' | 'female',
): number[] {
    if (gender === 'male') {
        return calculateMaleShapeKeys(m);
    } else {
        return calculateFemaleShapeKeys(m);
    }
}

function calculateMaleShapeKeys(m: BasicMeasurements): number[] {
    const avg = MALE_AVG;

    // ── Raw normalised deltas (unclamped) ─────────────────────────────────────
    const dH = d(m.height, avg.height, 8);                          // height
    const dWt = d(m.weight, avg.weight, 15);                        // weight
    const dC = d(m.chest, avg.chest, 7);                            // chest girth
    const dW = d(m.waist, avg.waist, 7);                            // waist girth
    const dHip = d(m.hip, avg.hip, 7);                              // hip girth
    const dAge = d(m.age, avg.age, 20);                             // age

    const b = new Array(10).fill(0);

    // ── shape000: HEIGHT & SQUASH (INVERTED) ─────────────────────────────────
    // Decrease morph = taller & thinner. Increase = shorter & thicker.
    // We drive this strictly by height to guarantee accurate stature.
    b[0] = -dH;

    // ── shape001: FAT vs LEAN (INVERTED) ─────────────────────────────────────
    // Decrease = fatter, Increase = thinner
    // Since b[0]=-dH made the avatar synthetically thin, we MUST use raw Weight, Waist, 
    // and Hip deviations to balance it, routing the "volume" into fat.
    b[1] = -(dWt * 0.40) - (dW * 0.40) - (dHip * 0.20) - (dAge * 0.10);

    // ── shape002: TORSO LENGTH ───────────────────────────────────────────────
    // Taller people naturally have somewhat longer torsos.
    b[2] = dH * 0.35;

    // ── shape003: MUSCULAR + V-TAPER ─────────────────────────────────────────
    // Increase = more muscular & broader shoulders
    // Driven by Chest outstripping Waist. If they are heavy (dWt), some of it routes here.
    b[3] = (dC * 0.70) - (dW * 0.30) + (dWt * 0.15) - (dAge * 0.10);

    // ── shape004: PUFFY BELLY ────────────────────────────────────────────────
    // Driven heavily by waist and overall mass, lacking chest.
    b[4] = (dW * 0.60) + (dWt * 0.25) - (dC * 0.25) + (dAge * 0.20);

    // ── shape005: WAIST & HIP PUFFINESS ──────────────────────────────────────
    // Driven almost entirely by hips and waist.
    b[5] = (dHip * 0.60) + (dW * 0.40);

    // ── shape006: MUSCULARITY DEFINITION (INVERTED) ──────────────────────────
    // Decrease = more muscular/defined, Increase = softer.
    // Waist/fat masks definition, chest/muscle enhances it.
    b[6] = (dW * 0.50) - (dC * 0.40) + (dAge * 0.20);

    // ── shape007: CHEST VERTICAL POSITION (INVERTED) ─────────────────────────
    // Decrease = chest lifts, Increase = chest sags
    // Chest sags with extra overall mass, age, and specifically large chest mass.
    b[7] = (dWt * 0.35) + (dAge * 0.35) + (dC * 0.30);

    // ── shape008: MINIMAL HIPS/WAIST ─────────────────────────────────────────
    b[8] = (dHip * 0.45) + (dW * 0.25);

    // ── shape009: CHEST GAP WIDTH ────────────────────────────────────────────
    // Larger chest mass increases pectoral separation.
    b[9] = (dC * 0.60) + (dWt * 0.20);

    // Final hard clamp to [−5, 5]
    return b.map(v => clamp(v));
}

function calculateFemaleShapeKeys(m: BasicMeasurements): number[] {
    const avg = FEMALE_AVG;

    // ── Raw normalised deltas (unclamped) ─────────────────────────────────────
    const dH = d(m.height, avg.height, 8);                          // height
    const dWt = d(m.weight, avg.weight, 12);                        // weight (females vary slightly differently in scale)
    const dC = d(m.chest, avg.chest, 7);                            // bust/chest girth
    const dW = d(m.waist, avg.waist, 7);                            // waist girth
    const dHip = d(m.hip, avg.hip, 8);                              // hip girth
    const dAge = d(m.age, avg.age, 20);                             // age

    const b = new Array(10).fill(0);

    // ── shape000: HEIGHT & SQUASH (INVERTED) ─────────────────────────────────
    // Same as male: + morph = shorter & thicker, - morph = taller & thinner.
    b[0] = -dH;

    // ── shape001: FAT vs LEAN (INVERTED) ─────────────────────────────────────
    // Decrease = fatter (overall volume), Increase = thinner.
    // We counteract the b[0] scale squash by distributing raw mass into 'fatness'.
    // Driven heavily by hips, waist, and overall weight.
    b[1] = -(dWt * 0.45) - (dHip * 0.35) - (dW * 0.15) - (dAge * 0.10);

    // ── shape002: TORSO PROPORTION ───────────────────────────────────────────
    // Taller women generally have slightly longer torsos / longer necks in SMPL.
    b[2] = dH * 0.40;

    // ── shape003: CURVATURE VOL (BREASTS / HIPS) ─────────────────────────────
    // Increase = fuller feminine curves (larger bust and hips, relative to waist).
    // This is essentially the "hourglass/feminine volume" morph.
    b[3] = (dC * 0.50) + (dHip * 0.40) - (dW * 0.20) + (dWt * 0.15) - (dAge * 0.10);

    // ── shape004: PUFFY BELLY / PREGNANT SHAPE ───────────────────────────────
    // Increase = protruding belly/thicker midsection lacking bust volume.
    b[4] = (dW * 0.70) + (dWt * 0.20) - (dC * 0.30) + (dAge * 0.25);

    // ── shape005: PEAR SHAPE (HIPS & THIGHS) ─────────────────────────────────
    // Increase = thick lower body (hips/thighs) without directly puffing waist as much.
    b[5] = (dHip * 0.65) - (dC * 0.15) + (dWt * 0.10);

    // ── shape006: RECTANGLE vs HOURGLASS SHAPE ───────────────────────────────
    // Increase = rectangular/apple (thicker waist, smaller bust).
    // Decrease = extreme hourglass (tiny waist, large bust).
    b[6] = (dW * 0.55) - (dC * 0.40) - (dHip * 0.15) + (dAge * 0.15);

    // ── shape007: BREAST SAG / VERTICAL OFFSETS ──────────────────────────────
    // Increase = breasts lower/sag. Heavy weight and age stretch it down.
    b[7] = (dAge * 0.45) + (dWt * 0.35) + (dC * 0.30);

    // ── shape008: MINIMAL LOVE HANDLES ───────────────────────────────────────
    b[8] = (dW * 0.40) + (dHip * 0.20);

    // ── shape009: BREAST SEPARATION (CLEAVAGE GAP) ───────────────────────────
    // Increase = further apart and slightly flatter.
    b[9] = (dC * 0.50) + (dWt * 0.20) - (dH * 0.10);

    // Final hard clamp to [−5, 5]
    return b.map(v => clamp(v));
}

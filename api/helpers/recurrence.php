<?php

/**
 * Espande una regola di ricorrenza in un elenco di date
 * all'interno dell'intervallo [da, a].
 *
 * @param string      $data_inizio     Data di inizio (Y-m-d)
 * @param string      $ricorrenza      nessuna|settimanale|mensile|annuale
 * @param string|null $ricorrenza_fine Data di fine ricorrenza (Y-m-d) o null
 * @param string      $da              Inizio intervallo richiesto (Y-m-d)
 * @param string      $a               Fine intervallo richiesto (Y-m-d)
 * @return array      Lista di date (stringhe Y-m-d)
 */
function espandi_ricorrenza(
    string $data_inizio,
    string $ricorrenza,
    ?string $ricorrenza_fine,
    string $da,
    string $a
): array {
    $occorrenze = [];
    $inizio = new DateTime($data_inizio);
    $da_dt  = new DateTime($da);
    $a_dt   = new DateTime($a);
    $fine_dt = $ricorrenza_fine ? new DateTime($ricorrenza_fine) : null;

    if ($ricorrenza === 'nessuna') {
        if ($inizio >= $da_dt && $inizio <= $a_dt) {
            $occorrenze[] = $data_inizio;
        }
        return $occorrenze;
    }

    $intervallo = match ($ricorrenza) {
        'settimanale' => new DateInterval('P7D'),
        'mensile'     => new DateInterval('P1M'),
        'annuale'     => new DateInterval('P1Y'),
        default       => null,
    };

    if ($intervallo === null) {
        return $occorrenze;
    }

    $corrente = clone $inizio;

    // Limite massimo: fine ricorrenza o fine intervallo richiesto
    $limite = $a_dt;
    if ($fine_dt !== null && $fine_dt < $limite) {
        $limite = $fine_dt;
    }

    while ($corrente <= $limite) {
        if ($corrente >= $da_dt) {
            $occorrenze[] = $corrente->format('Y-m-d');
        }
        $corrente->add($intervallo);
    }

    return $occorrenze;
}

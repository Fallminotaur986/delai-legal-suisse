"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DelaiLegalSuisse() {
  const [acte, setActe] = useState('');
  const [procedure, setProcedure] = useState('');
  const [typeAP, setTypeAP] = useState('');
  const [dateNotification, setDateNotification] = useState('');
  const [dateFinale, setDateFinale] = useState(null);
  const [details, setDetails] = useState([]);

  const actesConfig = {
    'autorisation-proceder': {
      label: "Autorisation de procéder (Art. 209 CPC)",
      needsTypeAP: true,
      needsProcedure: false,
      getDelai: (type) => ({
        unite: type === 'bail' ? 'jours' : 'mois',
        valeur: type === 'bail' ? 30 : 3,
        debutLendemain: type === 'bail',
        appliqueFeries: true
      })
    },
    'appel': {
      label: "Appel (Art. 311/314 CPC)",
      needsProcedure: true,
      needsTypeAP: false,
      getDelai: (procedure) => ({
        unite: 'jours',
        valeur: procedure === 'sommaire' ? 10 : 30,
        debutLendemain: true,
        appliqueFeries: procedure !== 'sommaire'
      })
    },
    'recours': {
      label: "Recours (Art. 321 CPC)",
      needsProcedure: true,
      needsTypeAP: false,
      getDelai: (procedure) => ({
        unite: 'jours',
        valeur: procedure === 'sommaire' ? 10 : 30,
        debutLendemain: true,
        appliqueFeries: procedure !== 'sommaire'
      })
    }
  };

  const estPeriodeSuspension = (date) => {
    const d = new Date(date);
    const jour = d.getDate();
    const mois = d.getMonth();

    if ((mois === 11 && jour >= 18) || (mois === 0 && jour <= 2)) {
      return "Féries de fin d'année";
    }
    if ((mois === 6 && jour >= 15) || (mois === 7 && jour <= 15)) {
      return "Féries d'été";
    }
    return false;
  };

  const compterJoursSuspension = (debut, fin) => {
    let joursTotal = 0;
    let dateCourante = new Date(debut);
    let dateFin = new Date(fin);
    
    while (dateCourante <= dateFin) {
      if (estPeriodeSuspension(dateCourante)) {
        joursTotal++;
      }
      dateCourante.setDate(dateCourante.getDate() + 1);
    }
    return joursTotal;
  };

  const estJourFerie = (date) => {
    const d = new Date(date);
    const jour = d.getDate();
    const mois = d.getMonth() + 1;

    if ((mois === 1 && jour === 1) || // Nouvel An
        (mois === 1 && jour === 2) || // 2 janvier
        (mois === 8 && jour === 1) || // Fête nationale
        (mois === 12 && jour === 25) || // Noël
        (mois === 12 && jour === 26)) { // Saint Étienne
      return true;
    }
    return false;
  };

  const estWeekend = (date) => {
    const jour = date.getDay();
    return jour === 0 || jour === 6;
  };

  const estJourNonOuvrable = (date) => {
    return estWeekend(date) || estJourFerie(date);
  };

  const calculerDelai = () => {
    if (!acte || !dateNotification || 
        (actesConfig[acte].needsProcedure && !procedure) ||
        (actesConfig[acte].needsTypeAP && !typeAP)) return;

    let detailsCalcul = [];
    let dateDebut = new Date(dateNotification);
    let delaiInfo;

    if (acte === 'autorisation-proceder') {
      delaiInfo = actesConfig[acte].getDelai(typeAP);
      detailsCalcul.push(`Type d'autorisation de procéder: ${typeAP === 'bail' ? 'Bail (30 jours)' : 'Autre (3 mois)'}`);
    } else {
      delaiInfo = actesConfig[acte].getDelai(procedure);
    }

    if (delaiInfo.debutLendemain) {
      dateDebut.setDate(dateDebut.getDate() + 1);
      detailsCalcul.push(`Début du délai le ${dateDebut.toLocaleDateString('fr-CH')} (lendemain de la notification - Art. 142 al. 1 CPC)`);
    } else {
      detailsCalcul.push(`Début du délai le ${dateDebut.toLocaleDateString('fr-CH')} (jour de la notification - Art. 142 al. 2 CPC)`);
    }

    if (delaiInfo.appliqueFeries) {
      detailsCalcul.push("Les féries sont applicables à ce délai");
    } else {
      detailsCalcul.push("Les féries ne sont PAS applicables (Art. 145 al. 2 CPC)");
    }

    let dateCalculee = new Date(dateDebut);
    
    if (delaiInfo.unite === 'jours') {
      let joursComptes = 0;
      while (joursComptes < delaiInfo.valeur) {
        const suspension = delaiInfo.appliqueFeries ? estPeriodeSuspension(dateCalculee) : false;
        if (!suspension) {
          joursComptes++;
          detailsCalcul.push(`Jour ${joursComptes} compté le ${dateCalculee.toLocaleDateString('fr-CH')}`);
        } else {
          detailsCalcul.push(`${dateCalculee.toLocaleDateString('fr-CH')}: Suspension (${suspension})`);
        }
        dateCalculee.setDate(dateCalculee.getDate() + 1);
      }
      dateCalculee.setDate(dateCalculee.getDate() - 1);
    } else if (delaiInfo.unite === 'mois') {
      dateCalculee.setMonth(dateCalculee.getMonth() + delaiInfo.valeur);
      
      if (dateCalculee.getDate() !== dateDebut.getDate()) {
        dateCalculee = new Date(dateCalculee.getFullYear(), dateCalculee.getMonth() + 1, 0);
        detailsCalcul.push("Ajustement au dernier jour du mois (Art. 142 al. 2 CPC)");
      }

      if (delaiInfo.appliqueFeries) {
        const joursSuspension = compterJoursSuspension(dateDebut, dateCalculee);
        if (joursSuspension > 0) {
          detailsCalcul.push(`Extension de ${joursSuspension} jours due aux féries`);
          dateCalculee.setDate(dateCalculee.getDate() + joursSuspension);
        }
      }
    }

    if (estJourNonOuvrable(dateCalculee)) {
      const dateAvantReport = new Date(dateCalculee);
      while (estJourNonOuvrable(dateCalculee)) {
        dateCalculee.setDate(dateCalculee.getDate() + 1);
      }
      detailsCalcul.push(`Report du ${dateAvantReport.toLocaleDateString('fr-CH')} (jour non ouvrable) au ${dateCalculee.toLocaleDateString('fr-CH')} (Art. 142 al. 3 CPC)`);
    }

    setDateFinale(dateCalculee);
    setDetails(detailsCalcul);
  };

  const resetForm = (newActe) => {
    setActe(newActe);
    setProcedure('');
    setTypeAP('');
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          Calculateur intelligent de délais légaux suisses
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type d'acte</Label>
            <Select onValueChange={resetForm}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un acte" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(actesConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {acte && actesConfig[acte].needsTypeAP && (
            <div className="space-y-2">
              <Label>Type d'autorisation de procéder</Label>
              <Select onValueChange={setTypeAP}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bail">Bail (30 jours)</SelectItem>
                  <SelectItem value="autre">Autre (3 mois)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {acte && actesConfig[acte].needsProcedure && (
            <div className="space-y-2">
              <Label>Type de procédure</Label>
              <Select onValueChange={setProcedure}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une procédure" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ordinaire">Procédure ordinaire</SelectItem>
                  <SelectItem value="simplifiee">Procédure simplifiée</SelectItem>
                  <SelectItem value="sommaire">Procédure sommaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Date de notification</Label>
            <input
              type="date"
              className="w-full p-2 border rounded"
              value={dateNotification}
              onChange={(e) => setDateNotification(e.target.value)}
            />
          </div>

          <Button 
            onClick={calculerDelai}
            className="w-full"
            disabled={!dateNotification || !acte || 
                     (actesConfig[acte].needsProcedure && !procedure) ||
                     (actesConfig[acte].needsTypeAP && !typeAP)}
          >
            Calculer
          </Button>
          
          {dateFinale && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <h3 className="font-bold">Date d'échéance: {dateFinale.toLocaleDateString('fr-CH')}</h3>
              <div className="mt-2 space-y-1">
                {details.map((detail, index) => (
                  <p key={index} className="text-sm text-gray-600">{detail}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

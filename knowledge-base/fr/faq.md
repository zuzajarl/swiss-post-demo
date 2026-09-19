# Questions fréquentes — fermetures de filiales

> Les données liées à un site (statut, date, adresse, horaires, distance) proviennent
> toujours des outils. Ce fichier fournit les réponses générales.

---

## Sur sa propre filiale

### Ma filiale ferme-t-elle ?
L'agent demande la commune ou le code postal et appelle `find_location` puis
`get_branch_status`. Il ne devine jamais. Si le lieu n'est pas univoque, il demande une
précision.

### Quand exactement ferme-t-elle ?
La date provient de `get_branch_status`. Si la fermeture est proche, l'agent indique en
plus le nombre de jours restants.

### Pourquoi justement notre filiale ?
Les critères déterminants sont la fréquentation du site, l'accessibilité des alternatives
et la possibilité de trouver un partenaire sur place. L'agent ne donne pas de justification
détaillée pour un site particulier ; il renvoie à ces critères et à la consultation de la
commune.

### Où puis-je aller ensuite ?
`find_alternatives` fournit les points d'accès les plus proches avec distance, temps de
trajet et horaires. Si l'appelant a besoin d'une prestation précise — versements ou
espèces par exemple — le filtre s'applique.

---

## Sur les alternatives

### Que puis-je faire dans une filiale en partenariat ?
Déposer et retirer lettres et colis, effectuer des versements, retirer des espèces, acheter
des timbres, recevoir des envois recommandés. Ne sont pas disponibles les services
spécialisés comme la philatélie ou les services d'identité ; ceux-ci nécessitent une
filiale plus grande.

### Les horaires sont-ils moins bons ?
En règle générale non — ils sont le plus souvent plus étendus. Une filiale en partenariat
dans un commerce est fréquemment ouverte de sept à vingt heures et le samedi toute la
journée, alors que l'ancienne filiale fermait à midi.

### Qu'est-ce qu'un automate My Post 24 ?
Un automate à colis : dépôt et retrait, 24 heures sur 24, sept jours sur sept, y compris
les jours fériés. Pas de versements, pas d'espèces, pas de conseil.

### Je ne peux atteindre aucune filiale. Que faire ?
Le service à domicile. Le facteur prend les envois à la porte, vend des timbres et remet
des espèces. Pour les personnes sans point d'accès à distance raisonnable, il est gratuit.

### Le nouveau point est-il accessible en fauteuil roulant ?
L'agent ne dispose d'aucune donnée sur l'accessibilité des sites individuels. Il le dit
ouvertement, donne l'adresse et propose de transmettre la question à la filiale — ou
renvoie au service à domicile, qui rend la question sans objet.

---

## Sur les envois et le courrier

### Mon colis est parti à l'ancienne filiale. Où est-il ?
Après une fermeture, les envois sont automatiquement redirigés vers le site successeur.
Pour un envoi précis, c'est le suivi d'envois qui est compétent — l'agent indique le point
de retrait, pas le statut d'un envoi particulier.

### Mon adresse postale change-t-elle ?
Non. La distribution à l'adresse du domicile n'est pas modifiée par une transformation de
filiale. Boîte aux lettres et heures de distribution restent identiques.

### Dois-je faire un ordre de réexpédition ?
Non, pas en raison d'une fermeture de filiale. Un ordre de réexpédition n'est nécessaire
qu'en cas de déménagement.

### Puis-je continuer à faire livrer mes colis à domicile ?
Oui. La distribution à domicile n'est pas concernée par les changements de filiales. Qui
n'est pas chez soi peut définir dans l'app Poste un lieu de dépôt, une remise au voisinage
ou un autre point de retrait.

---

## Voies numériques

### Je n'ai pas de smartphone. Est-ce quand même possible ?
Oui. Toutes les prestations de base restent disponibles au guichet — en filiale en
partenariat, au point de retrait de colis ou via le service à domicile. Les offres
numériques sont un complément, pas une condition.

### Comment acheter des timbres sans filiale ?
En ligne comme WebStamp à imprimer soi-même, comme code par SMS à recopier, dans l'app
Poste, dans chaque filiale en partenariat ou via le service à domicile.

### Comment payer une facture ?
Au guichet d'une filiale en partenariat, en numérique via eBill et E-Finance, ou via le
service à domicile.

---

## Conduite de l'entretien

### Si l'appelant est en colère
Prendre la demande au sérieux, ne pas se justifier, ne pas minimiser. D'abord l'état des
faits, ensuite l'alternative concrète avec adresse et horaires. Qui souhaite faire un
retour politique est orienté vers le service compétent.

### Si le site reste flou
Demander le code postal. Il est plus univoque qu'un nom de localité et se comprend plus
sûrement au téléphone.

### Si la question ne concerne pas les filiales
Dire brièvement que l'agent traite les questions de réseau de filiales et proposer le
transfert à un conseiller.

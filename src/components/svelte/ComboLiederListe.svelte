<script>
    import { onMount } from "svelte";
    import axios from "axios";
    import DataTable, { Head, Body, Row, Cell, Label } from "@smui/data-table";
    import Select, { Option } from "@smui/select";
    import CircularProgress from "@smui/circular-progress";
    import IconButton from "@smui/icon-button";
    import FloatingLabel from "@smui/floating-label";
    import Checkbox from "@smui/checkbox";
    import FormField from "@smui/form-field";
    import Textfield from "@smui/textfield";
    import Icon from "@smui/textfield/icon";
    import HelperText from "@smui/textfield/helper-text";
    import {getAuthHeader, isUserAuth} from './auth.js';
    // import Tooltip, {
    //     Wrapper,
    //     Title,
    //     Content,
    //     Link,
    //     RichActions,
    // } from "@smui/tooltip";
    import Dialog, {
        Title,
        Content,
        Actions,
        InitialFocus,
    } from "@smui/dialog";
    import Button, { Label as BtnLabel } from "@smui/button";

    let liederListe;
    let liederListeAll;
    let liederListeKat;

    let open = false;
    let liedtext;
    let liedtitelDlg;
    let response = "Nothing yet.";
    let userAuth;
    onMount(() => {
        userAuth = isUserAuth(); 
        axios
            .get(
                "https://www.evang9.wien/root/wp-json/combo/v2/comboLiederListe", getAuthHeader()
            )
            .then((response) => {
                liederListe = JSON.parse(response.data);
                liederListe = liederListe.map((lied) => {
                    const days = Math.ceil(
                        (new Date() - new Date(lied.zuletzt_gesungen)) /
                            (1000 * 3600 * 24 * 7)
                    );

                    const w = { zuletzt: days };
                    return { ...lied, ...w };
                });
                liederListeAll = liederListe;
                handleFilterKat();
            });
    });
    let sort = "Titel";
    let sortDirection = "ascending";
    function handleSort() {
        const sortFct = (a, b) => {
            const [aVal, bVal] = [a[sort], b[sort]][
                sortDirection === "ascending" ? "slice" : "reverse"
            ]();
            if (typeof aVal === "string" && typeof bVal === "string") {
                return aVal.localeCompare(bVal);
            }
            return Number(aVal) - Number(bVal);
        };
        liederListe.sort(sortFct);
        liederListe = liederListe;

        liederListeAll.sort(sortFct);
        liederListeAll = liederListeAll;
    }
    let filterNoten = "";
    let inputA = "";
    let floatingLabelA;

    function handleFilterNoten() {
        setTimeout(() => {
            liederListe = liederListeKat.filter(
                (lied) =>
                    lied.Titel.toLowerCase().includes(
                        filterNoten.toLowerCase()
                    ) ||
                    lied.Liedtext.toLowerCase().includes(
                        filterNoten.toLowerCase()
                    )
            );
            // handleFilterKat(liederListe);
        }, 500);
    }

    let filterKat = "Combolieder";
    let kategorien = [
        "Combolieder",
        "Alle Lieder",
        "freiTöne",
        "EG-Lieder",
        "Kinder",
        "Weihnachten",
        "Comboprobe",
    ];

    function handleFilterKat() {
        setTimeout(() => {
            // console.log("Filter: ", filterKat);
            if (filterKat == "Alle Lieder") {
                liederListe = liederListeAll;
            } else if (filterKat == "Combolieder") {
                liederListe = liederListeAll.filter((lied) => lied.Aktiv == 1);
            } else if (filterKat == "EG-Lieder") {
                liederListe = liederListeAll.filter((lied) => lied.EG != 0);
            } else {
                liederListe = liederListeAll.filter((lied) =>
                    lied.Kategorie.toLowerCase().includes(
                        filterKat.toLowerCase()
                    )
                );
            }
            liederListeKat = liederListe;
            filterNoten = '';
        }, 200);
    }
</script>
<center>
{#if userAuth}
<div>
    {#if liederListe}
        <Dialog
            bind:open
            aria-labelledby="default-focus-title"
            aria-describedby="default-focus-content"
        >
            <Title id="default-focus-title">{liedtitelDlg}</Title>
            <Content id="default-focus-content">
                {liedtext}
            </Content>
            <Actions>
                <!-- <Button on:click={() => (response = "I will make you! Do it!")}>
                    <Label>You Can't Make Me</Label>
                </Button> -->
                <Button style="color:black" defaultAction use={[InitialFocus]}>
                    <Label>Schließen</Label>
                </Button>
            </Actions>
        </Dialog>
        <div class="columns">
            <div class="margins ctext">
                <Textfield
                    class="ctext"
                    bind:value={filterNoten}
                    on:input={handleFilterNoten}
                    on:change={handleFilterNoten}
                    label="Suchbegriff"
                >
                    <Icon class="material-icons" slot="leadingIcon">search</Icon
                    >
                    <HelperText slot="helper"
                        >Suche im Titel oder im Liedtext</HelperText
                    >
                </Textfield>
            </div>
            <div class="margins">
                <Select
                    bind:value={filterKat}
                    on:click={handleFilterKat}
                    label="Kategorie"
                >
                    {#each kategorien as kat}
                        <Option value={kat}>{kat}</Option>
                    {/each}
                    <svelte:fragment slot="helperText">Auswahl der Lied Kategorie.</svelte:fragment>
                </Select>
            </div>
        </div>
        <!-- <IconButton class="material-icons" on:click={handleFilterKat}>search</IconButton> -->

        <!-- <FormField align="end">
            <Checkbox bind:checked={combo} on:input={handleFilterCombo}/>  
            <span slot="label">Combolied</span>                          
        </FormField> -->

        <DataTable
            sortable
            bind:sort
            bind:sortDirection
            on:SMUIDataTable:sorted={handleSort}
            table$aria-label="Liederliste"
            style="width: 100%;"
        >
            <Head>
                <Row>
                    <Cell style="width: 50%;" columnId="Titel">
                        <IconButton class="material-icons"
                            >arrow_upward</IconButton
                        ><Label>Noten</Label>
                    </Cell>
                    <Cell style="width: 30%;" sortable={false}>Hörprobe</Cell>
                    <Cell columnId="zuletzt"
                        ><IconButton class="material-icons"
                            >arrow_upward</IconButton
                        ><Label>zuletzt</Label></Cell
                    >
                    <Cell style="width: 5%;"></Cell>
                    <!-- <Cell columnId="Kategorie">
                        <IconButton class="material-icons"
                            >arrow_upward</IconButton
                        ><Label>Kategorie</Label></Cell
                    >
                    <Cell columnId="Aktiv"
                        ><IconButton class="material-icons"
                            >arrow_upward</IconButton
                        ><Label>Combolied</Label></Cell
                    > -->
                </Row>
            </Head>
            <Body>
                {#each liederListe as lied}
                    <Row>
                        <Cell>
                            <a
                                href="/root/wp-json/combo/v1/combolied/{lied.Dateiname}?lied={lied.Dateiname}&type=pdf"
                                target="Noten"
                            >
                                <img
                                    title="Noten"
                                    alt="Noten"
                                    src="/graphics/baseline-music_note-24px.svg"
                                />
                            </a>
                            <Button
                                style="color:black"
                                on:click={() => (
                                    (open = true),
                                    (liedtext = lied.Liedtext),
                                    (liedtitelDlg = lied.Titel)
                                )}
                            >
                                <Label>{lied.Titel}</Label>
                            </Button>

                            <!-- <Wrapper rich>
                                <Label>{lied.Titel}</Label>

                                <Tooltip
                                    style="z-index:100000;position:relative;"
                                    yPos="above"
                                    persistent
                                >
                                    <Title>With a Title!</Title>
                                    <Content>
                                        An interactive rich tooltip can have <Link
                                            href="http://example.com"
                                            target="_blank">links</Link
                                        > and actions.
                                    </Content>
                                </Tooltip>
                            </Wrapper> -->
                        </Cell>
                        <Cell>
                            {#if lied.MP3 != "0"}
                                <audio
                                    id="player{lied.lied_liste_nummer}"
                                    src="/root/wp-json/combo/v1/combolied/{lied.Dateiname}?lied={lied.Dateiname}&type=mp3"
                                    controls="controls"
                                    preload="none"
                                />
                            {/if}
                        </Cell>
                        <Cell>
                            {lied.zuletzt < 2000
                                ? lied.zuletzt + " Wochen"
                                : ""}
                        </Cell>
                        <Cell>
                            <a
                                href="/root/liedtext-update?filter_ID={lied.ID}"
                                target="Edit"
                            >
                            <img
                            title="Edit"
                            alt="Edit"
                            src="/graphics/baseline-edit-24px.svg"
                            />
                            </a>
                        </Cell>
                        <!-- <Cell>
                            {lied.Kategorie}
                        </Cell>
                        <Cell>
                            {lied.Aktiv == 1 ? "Ja" : "Nein"}
                        </Cell> -->
                    </Row>
                {/each}
            </Body>
        </DataTable>
    {:else}
        <div style="display: flex; justify-content: center">
            <CircularProgress
                style="height: 32px; width: 32px;"
                indeterminate
            />
        </div>
    {/if}
</div>
{:else}
Bitte zuerst einloggen.
{/if}
</center>

<style>
    .columns {
        display: flex;
        flex-wrap: wrap;
    }
    .margins {
        margin-right: 12px;
        margin-bottom: 12px;
    }

    .ctext :global(input) {
        border: white;
        background-color: white;
        font-size: 1rem;
    }

    :global(label) {
        color: #005091;
    }

    audio::-webkit-media-controls-panel {
        background-color: #ffffff;
    }

    :root {
        --mdc-theme-primary: #005091;
        --mdc-theme-secondary: #005091;
        --mdc-theme-background: #fff;
        --mdc-theme-surface: #fff;
        --mdc-theme-error: #b71c1c;
        --mdc-theme-on-primary: #fff;
        --mdc-theme-on-secondary: #fff;
        --mdc-theme-on-surface: #000;
        --mdc-theme-on-error: #fff;
        --mdc-theme-text-primary-on-background: rgba(0, 0, 0, 0.87);
        --mdc-theme-text-secondary-on-background: rgba(0, 0, 0, 0.54);
        --mdc-theme-text-hint-on-background: rgba(0, 0, 0, 0.38);
        --mdc-theme-text-disabled-on-background: rgba(0, 0, 0, 0.38);
        --mdc-theme-text-icon-on-background: rgba(0, 0, 0, 0.38);
        --mdc-theme-text-primary-on-light: rgba(0, 0, 0, 0.87);
        --mdc-theme-text-secondary-on-light: rgba(0, 0, 0, 0.54);
        --mdc-theme-text-hint-on-light: rgba(0, 0, 0, 0.38);
        --mdc-theme-text-disabled-on-light: rgba(0, 0, 0, 0.38);
        --mdc-theme-text-icon-on-light: rgba(0, 0, 0, 0.38);
        --mdc-theme-text-primary-on-dark: white;
        --mdc-theme-text-secondary-on-dark: rgba(255, 255, 255, 0.7);
        --mdc-theme-text-hint-on-dark: rgba(255, 255, 255, 0.5);
        --mdc-theme-text-disabled-on-dark: rgba(255, 255, 255, 0.5);
        --mdc-theme-text-icon-on-dark: rgba(255, 255, 255, 0.5);
    }
</style>

/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom"
import {screen, waitFor} from "@testing-library/dom"
import userEvent from '@testing-library/user-event'
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES, ROUTES_PATH} from "../constants/routes.js";
import {localStorageMock} from "../__mocks__/localStorage.js";
import Bills from '../containers/Bills.js'
import mockStore from "../__mocks__/store"
import router from "../app/Router.js";

jest.mock("../app/store", () => mockStore)

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    // l'icône facture doit être en surbrilliance
    test("Then bill icon in vertical layout should be highlighted", async () => {
      // affiche les données de la page employé
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills) // on navigate sur la page bills
      await waitFor(() => screen.getByTestId('icon-window')) //on attends le container d'icône
      const windowIcon = screen.getByTestId('icon-window') //on vient séléctionner l'icône d'oeil
      expect(windowIcon).toHaveClass('active-icon') //check si l'icône est en surbrillance - on vérifie si l'élément a la classe correspondante
    })
    test("Then bills should be ordered from earliest to latest", async () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      
      const billsContainer = new Bills({
        document, onNavigate, store: mockStore, localStorage: null
      })
      //on vient chercher les bills du mockstore et leurs dates
      const result = await billsContainer.getBills()
      const dates = result.map(bill => bill.date)

      const antiChrono = (a, b) => ((a < b) ? 1 : -1) //établi les règles de tri
      const datesSorted = [...dates].sort(antiChrono) // trie les dates 
      expect(dates).toEqual(datesSorted) // s'attends à ce que les dates soit égales au dates triées
    })

    test("Then it should fetch bills from mock API GET", async () => {
      // on vient importer notre mock local storage d'employé
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      // on fait naviguer sur la page des factures 
      await waitFor(() => screen.getByText("Mes notes de frais"))// cherche pour le text "Mes notes de frais" à l'écran
      const mockedBill1Nom  = await screen.getByText("encore")
      expect(mockedBill1Nom).toBeTruthy() // s'attends à une valeur "vraie"
      const mockedBill1Date  = await screen.getByText("4 Avr. 04") // cherche pour le text "4 Avr. 04" à l'écran
      expect(mockedBill1Date).toBeTruthy() // s'attends à une valeur "vraie"
    })
  })

  describe("When I click on new bill button", () => {
    test("Then it should open a page to create a new bill", () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      // on vient importer notre mock local storage d'employé
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      //  on crée un nouveau container pour les factures
      const billsContainer = new Bills({
        document, onNavigate, store: mockStore, localStorage: null
      })

      document.body.innerHTML = BillsUI({ data: bills }) // on rempli le form avec des données mock
      const handleClickButton = jest.fn((e) => billsContainer.handleClickNewBill()) // on click sur le bouton
      const newBillButton = screen.getByTestId('btn-new-bill')
      newBillButton.addEventListener('click', handleClickButton) // on écoute le click du bouton pour créer une facture
      userEvent.click(newBillButton) 
      expect(handleClickButton).toHaveBeenCalled() // on s'attends à ce que le boutton soit appelé 
      expect(screen.getByTestId('form-new-bill')).toBeTruthy() // on s''attends à une valeur "vraie" quand l'id "form-new-bill" est affiché
    })
  })

  describe("When I click on one of the eye icons", () => {
    test("Then it should open the modal and show an image", async () => {
      
      $.fn.modal = jest.fn(); // empêche erreur jQuery

      // défini le chemin d'accès
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      // affiche les données de la page
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }));
  
      document.body.innerHTML = BillsUI({ data: bills });

      const billsContainer = new Bills({
        document, onNavigate, store: mockStore, localStorage: window.localStorage
      });
      // récupère l'icône oeil
      const iconView = screen.getAllByTestId('icon-eye')[0];
      // créé la fonction à tester
      const openViewModal = jest.fn(billsContainer.handleClickIconEye(iconView));

      iconView.addEventListener('click', openViewModal); // écoute l'évènement au clic
      userEvent.click(iconView); // simule le clic

      expect(openViewModal).toHaveBeenCalled(); // on s'attend à ce que la fonction ait été appellée et donc la page chargée
      const modale = screen.getByTestId('modaleFile'); // on a ajouté un data-testid à la modale dans BillsUI qu'on récupère
      expect(modale).toBeTruthy(); // on s'attend à ce que la modale soit présente
    })
  })

  describe("When an error occurs on API", () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills")
      Object.defineProperty(
          window,
          'localStorage',
          { value: localStorageMock }
      )
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee',
        email: "a@a"
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.appendChild(root)
      router()
    })
    test("then it should fetch bills from an API and fails with 404 message error", async () => {
      // on prépare une erreur à envoyer
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list : () =>  {
            return Promise.reject(new Error("Erreur 404"))
          }
        }})
      window.onNavigate(ROUTES_PATH.Bills) // lorsque l'on navige sur la page bills, on envoie la "promise" préparée
      await new Promise(process.nextTick);
      const message = await screen.getByText(/Erreur 404/) // le message qui est sensé s'affiché est "error 404"
      expect(message).toBeTruthy() // on s'attends à ce qu'il y ait un message d'affiché
    })

    test("Then it should fetch messages from an API and fails with 500 message error", async () => {
    // on prépare une erreur à envoyer
      mockStore.bills.mockImplementationOnce(() => ({
        list: () => Promise.reject(new Error("Erreur 500")),
      }));
      onNavigate(ROUTES_PATH.Bills);
      const message = await screen.findByText(/Erreur 500/);
      expect(message).toBeInTheDocument();
    })
  })
})
